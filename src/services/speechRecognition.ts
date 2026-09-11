import type { LanguagePreference } from '../types';

// Web Speech API interface declarations for TypeScript
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultItem;
    isFinal: boolean;
  };
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: ISpeechRecognitionConstructor;
  webkitSpeechRecognition?: ISpeechRecognitionConstructor;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindowWithSpeech;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Returns the best BCP-47 language tag for speech recognition based on user preference.
 * On Android Chrome, 'hi-IN' reliably handles both pure Hindi and Hinglish speech.
 * 'en-IN' is ideal for Indian English.
 */
export function getRecognitionLanguageCode(preference: LanguagePreference): string {
  switch (preference) {
    case 'hindi':
      return 'hi-IN';
    case 'english':
      return 'en-IN';
    case 'hinglish':
    case 'auto':
    default:
      // hi-IN on Android Google Speech accurately recognizes mixed Hinglish and Hindi words
      return 'hi-IN';
  }
}

export interface SpeechRecognitionController {
  start: () => void;
  stop: () => void;
  abort: () => void;
  abortAsync: () => Promise<void>;
  isStarted: () => boolean;
}

export interface SpeechRecognitionOptions {
  continuous?: boolean;
  isWakeWordMode?: boolean;
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string, code?: string) => void;
  onEnd?: () => void;
}

export function createSpeechRecognizer(
  langPref: LanguagePreference,
  callbacks: SpeechRecognitionCallbacks,
  options: SpeechRecognitionOptions = {}
): SpeechRecognitionController | null {
  if (!isSpeechRecognitionSupported()) {
    callbacks.onError?.('Speech recognition is not supported in this browser.', 'not-supported');
    return null;
  }

  const win = window as unknown as IWindowWithSpeech;
  const SpeechConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!SpeechConstructor) return null;

  try {
    const recognition = new SpeechConstructor();
    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = getRecognitionLanguageCode(langPref);

    let isRunning = false;

    recognition.onstart = () => {
      isRunning = true;
      callbacks.onStart?.();
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (options.isWakeWordMode) {
        // In wake word mode, evaluate the full combined utterance immediately so interim wake words trigger without latency
        const combined = `${final} ${interim}`.trim();
        if (combined) {
          callbacks.onResult?.(combined, Boolean(final));
        }
      } else {
        // Standard and follow-up listening mode: maintain exact existing behavior
        if (final) {
          callbacks.onResult?.(final.trim(), true);
        } else if (interim) {
          callbacks.onResult?.(interim.trim(), false);
        }
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      // In wake-word passive standby mode, 'no-speech' or 'aborted' is expected when user pauses in between utterances
      if (options.isWakeWordMode && (event.error === 'no-speech' || event.error === 'aborted')) {
        callbacks.onError?.('no-speech', event.error);
        return;
      }

      let friendlyMessage = 'Microphone or speech recognition error.';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        friendlyMessage =
          'Microphone access was denied. Please allow microphone permissions in your browser or site settings.';
      } else if (event.error === 'no-speech') {
        friendlyMessage = "I didn't hear anything. Tap the mic and speak again!";
      } else if (event.error === 'network') {
        friendlyMessage = 'Speech recognition network error. Please check your internet connection.';
      } else if (event.error === 'audio-capture') {
        friendlyMessage = 'No microphone was detected on your device.';
      }
      callbacks.onError?.(friendlyMessage, event.error);
    };

    recognition.onend = () => {
      isRunning = false;
      callbacks.onEnd?.();
    };

    return {
      start: () => {
        if (isRunning) return;
        const attemptStart = (retriesLeft = 2) => {
          try {
            recognition.start();
          } catch (err: unknown) {
            const isInvalidState =
              err instanceof Error && err.name === 'InvalidStateError';
            if (isInvalidState && retriesLeft > 0) {
              setTimeout(() => {
                if (!isRunning) attemptStart(retriesLeft - 1);
              }, 120);
            } else {
              console.debug('Recognition start notice:', err);
            }
          }
        };
        attemptStart();
      },
      stop: () => {
        try {
          isRunning = false;
          recognition.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        try {
          isRunning = false;
          recognition.abort();
        } catch {
          // ignore
        }
      },
      abortAsync: () => {
        return new Promise<void>((resolve) => {
          if (!isRunning) {
            resolve();
            return;
          }
          let resolved = false;
          const finish = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          const safetyTimer = setTimeout(finish, 140);
          const originalOnEnd = recognition.onend;
          recognition.onend = () => {
            clearTimeout(safetyTimer);
            isRunning = false;
            try {
              originalOnEnd?.call(recognition);
            } catch {
              // ignore
            }
            finish();
          };
          try {
            isRunning = false;
            recognition.abort();
          } catch {
            clearTimeout(safetyTimer);
            finish();
          }
        });
      },
      isStarted: () => isRunning,
    };
  } catch (err) {
    console.error('Failed to create SpeechRecognition instance:', err);
    callbacks.onError?.('Could not initialize speech recognition.', 'init-error');
    return null;
  }
}
