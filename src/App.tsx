import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  AssistantState,
  Message,
  TiaSettings,
  SpeechVoiceOption,
  TiaEmotion,
  OwnerProfile,
} from './types';
import { Header } from './components/Header';
import { VoiceOrb } from './components/VoiceOrb';
import { VoiceControls } from './components/VoiceControls';
import { ConversationPreview } from './components/ConversationPreview';
import { SettingsModal } from './components/SettingsModal';
import { ErrorMessage } from './components/ErrorMessage';
import {
  WakeWordDebugIndicator,
  type WakeWordDebugInfo,
} from './components/WakeWordDebugIndicator';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognitionController,
} from './services/speechRecognition';
import {
  getAvailableVoices,
  selectContextualVoice,
  speakEmotionally,
  type SpeechSessionController,
} from './services/speechSynthesis';
import {
  detectWakeWord,
  playWakeChime,
  checkMicrophonePermission,
  requestMicrophoneAccess,
} from './services/wakeWord';

const DEFAULT_SETTINGS: TiaSettings = {
  voiceEnabled: true,
  autoVoiceSelection: true,
  speechRate: 1.0,
  languagePreference: 'auto',
  funnyMode: true,
  theme: 'dark',
  selectedVoiceURI: '',
  handsFreeMode: true,
  followUpTimeoutSeconds: 4,
  wakeChimeEnabled: true,
};

export default function App() {
  // Application State
  const [settings, setSettings] = useState<TiaSettings>(() => {
    try {
      const stored = localStorage.getItem('tia_settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastUserQuery, setLastUserQuery] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechVoiceOption[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<TiaEmotion>('neutral');
  const [currentVoiceName, setCurrentVoiceName] = useState<string>('');
  const [micPermission, setMicPermission] = useState<
    'granted' | 'denied' | 'prompt' | 'unsupported'
  >('prompt');
  const [followUpRemaining, setFollowUpRemaining] = useState<number>(4);

  // Persistent Owner Profile State (stored in persistent DB & cached in localStorage)
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(() => {
    try {
      const cached = localStorage.getItem('tia_owner_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Fetch persistent owner profile from server on boot
  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.profile) {
          setOwnerProfile(data.profile);
          localStorage.setItem('tia_owner_profile', JSON.stringify(data.profile));
        }
      })
      .catch((err) => console.warn('Failed to load owner profile:', err));
  }, []);

  // Wake-word diagnostic debug state
  const [debugInfo, setDebugInfo] = useState<WakeWordDebugInfo>({
    wakeWordActive: false,
    micPermission: 'prompt',
    recognizerStatus: 'Initializing...',
    lastRecognizedSpeech: '',
    lastRecognizedTimestamp: '',
    lastWakeDetected: null,
    activeLangCode: 'hi-IN',
  });

  // Speech & Timer Controllers References
  const recognizerRef = useRef<SpeechRecognitionController | null>(null);
  const recognitionModeRef = useRef<'idle_wake' | 'active' | 'follow_up'>('idle_wake');
  const transcriptBufferRef = useRef<string>('');
  const speechSessionRef = useRef<SpeechSessionController | null>(null);
  const followUpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const isComponentMounted = useRef(true);

  // Sync ref for state in callbacks
  const stateRef = useRef(assistantState);
  useEffect(() => {
    stateRef.current = assistantState;
  }, [assistantState]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Check microphone permissions on mount
  useEffect(() => {
    isComponentMounted.current = true;
    checkMicrophonePermission().then((status) => {
      if (isComponentMounted.current) {
        setMicPermission(status);
        setDebugInfo((prev) => ({ ...prev, micPermission: status }));
      }
    });
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem('tia_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Sync theme class to document body
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.className =
        'bg-slate-100 text-slate-900 antialiased overflow-hidden select-none';
    } else {
      document.documentElement.classList.add('dark');
      document.body.className =
        'bg-[#0b0f19] text-slate-100 antialiased overflow-hidden select-none';
    }
  }, [settings.theme]);

  // Load voices on mount and on voiceschanged
  useEffect(() => {
    const updateVoices = () => {
      const voices = getAvailableVoices();
      setAvailableVoices(voices);
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Clear follow-up countdown interval
  const clearFollowUpTimer = useCallback(() => {
    if (followUpTimerRef.current) {
      clearInterval(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }
  }, []);

  // Clear question wait timer
  const clearQuestionWaitTimer = useCallback(() => {
    if (questionWaitTimerRef.current) {
      clearTimeout(questionWaitTimerRef.current);
      questionWaitTimerRef.current = null;
    }
  }, []);

  // Clear speech silence debounce timer
  const clearSpeechSilenceTimer = useCallback(() => {
    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
  }, []);

  // Stop any active speech synthesis (with support for barge-in)
  const stopSpeech = useCallback(() => {
    if (speechSessionRef.current) {
      speechSessionRef.current.cancel();
      speechSessionRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (assistantState === 'speaking') {
      setAssistantState('idle');
    }
  }, [assistantState]);

  // Forward declarations for mutual references
  const startListeningRef = useRef<(isFollowUp?: boolean) => void>(() => {});
  const startWakeWordListenerRef = useRef<() => void>(() => {});
  const submitToTiaRef = useRef<(query: string) => Promise<void>>(async () => {});

  // Speak response out loud, with hands-free follow-up listening chained at the end
  const speakResponse = useCallback(
    (
      textToSpeak: string,
      emotion: TiaEmotion = 'neutral',
      detectedLanguage: 'hindi' | 'hinglish' | 'english' = 'hinglish',
      contextType?: any,
      suggestedVoiceGender?: 'female' | 'male' | 'any'
    ) => {
      if (!settings.voiceEnabled) {
        if (settings.handsFreeMode) {
          startListeningRef.current(true);
        } else {
          setAssistantState('idle');
        }
        return;
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setAssistantState('idle');
        return;
      }

      // Stop any prior speech session
      if (speechSessionRef.current) {
        speechSessionRef.current.cancel();
        speechSessionRef.current = null;
      }

      // Contextual voice resolution
      const { voice, voiceLabel } = selectContextualVoice({
        emotion,
        detectedLanguage,
        contextType,
        preferredGender: suggestedVoiceGender,
        userPreferenceURI: settings.autoVoiceSelection
          ? undefined
          : settings.selectedVoiceURI,
      });

      setCurrentEmotion(emotion);
      setCurrentVoiceName(voiceLabel);

      speechSessionRef.current = speakEmotionally({
        text: textToSpeak,
        emotion,
        voice,
        baseRate: settings.speechRate,
        onStart: () => {
          setAssistantState('speaking');
          setDebugInfo((prev) => ({
            ...prev,
            wakeWordActive: false,
            recognizerStatus: 'SPEAKING',
          }));
        },
        onEnd: () => {
          speechSessionRef.current = null;
          // When Tia finishes speaking, naturally transition to follow-up listening
          if (settingsRef.current.handsFreeMode && isSpeechRecognitionSupported()) {
            startListeningRef.current(true);
          } else {
            setAssistantState('idle');
          }
        },
        onError: (err) => {
          console.warn('Speech playback notice:', err);
          speechSessionRef.current = null;
          setAssistantState('idle');
        },
      });
    },
    [
      settings.voiceEnabled,
      settings.handsFreeMode,
      settings.autoVoiceSelection,
      settings.selectedVoiceURI,
      settings.speechRate,
    ]
  );

  // Submit query to Tia AI
  const submitToTia = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed) return;

      clearFollowUpTimer();
      clearQuestionWaitTimer();
      clearSpeechSilenceTimer();
      stopSpeech();
      setErrorMessage(null);
      setLastUserQuery(trimmed);
      setAssistantState('thinking');
      setDebugInfo((prev) => ({
        ...prev,
        wakeWordActive: false,
        recognizerStatus: 'PROCESSING',
      }));

      // User message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            funnyMode: settings.funnyMode,
            preferredLanguage: settings.languagePreference,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to receive response from Tia.');
        }

        // Update persistent owner profile if Tia remembered or updated anything
        if (data.ownerProfile) {
          setOwnerProfile(data.ownerProfile);
          try {
            localStorage.setItem('tia_owner_profile', JSON.stringify(data.ownerProfile));
          } catch {
            // ignore
          }
        }

        const replyContent =
          data.reply ||
          "Arre, main abhi sun nahi paayi. Kya tum dobara pooch sakte ho?";
        const replyEmotion: TiaEmotion = data.emotion || 'neutral';
        const detectedLang = data.detectedLanguage || 'hinglish';
        const contextType = data.contextType || 'chat';
        const suggestedGender = data.suggestedVoiceGender || 'female';

        // Pre-resolve voice name to label on message card
        const { voiceLabel } = selectContextualVoice({
          emotion: replyEmotion,
          detectedLanguage: detectedLang,
          contextType,
          preferredGender: suggestedGender,
          userPreferenceURI: settings.autoVoiceSelection
            ? undefined
            : settings.selectedVoiceURI,
        });

        const tiaMsg: Message = {
          id: `tia-${Date.now()}`,
          role: 'assistant',
          content: replyContent,
          timestamp: Date.now(),
          model: data.model,
          emotion: replyEmotion,
          voiceName: voiceLabel,
          detectedLanguage: detectedLang,
        };

        setMessages((prev) => [...prev, tiaMsg]);

        // Speak Tia's answer out loud with natural prosody and chosen voice
        speakResponse(
          replyContent,
          replyEmotion,
          detectedLang,
          contextType,
          suggestedGender
        );
      } catch (err: unknown) {
        console.error('Error contacting Tia backend:', err);
        const errStr =
          err instanceof Error
            ? err.message
            : 'Error connecting to Tia. Please check connection.';
        setErrorMessage(errStr);
        setAssistantState('idle');
      }
    },
    [
      messages,
      settings.funnyMode,
      settings.languagePreference,
      settings.autoVoiceSelection,
      settings.selectedVoiceURI,
      speakResponse,
      stopSpeech,
      clearFollowUpTimer,
    ]
  );
  submitToTiaRef.current = submitToTia;

  // Stop speech recognition
  const stopListening = useCallback(() => {
    clearFollowUpTimer();
    clearQuestionWaitTimer();
    clearSpeechSilenceTimer();
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    const finalQuery = transcriptBufferRef.current.trim();
    setLiveTranscript('');

    if (finalQuery) {
      submitToTia(finalQuery);
    } else {
      setAssistantState('idle');
    }
  }, [submitToTia, clearFollowUpTimer, clearQuestionWaitTimer, clearSpeechSilenceTimer]);

  // Clean transition from wake word detection to active question listening
  const transitionToQuestionListening = useCallback(async () => {
    // 1. Cleanly stop and await wake recognizer shutdown so mic is completely released
    if (recognizerRef.current) {
      const oldRecognizer = recognizerRef.current;
      recognizerRef.current = null;
      try {
        await oldRecognizer.abortAsync();
      } catch {
        // ignore
      }
    }

    // 2. Short pause for microphone audio stream handover
    await new Promise((resolve) => setTimeout(resolve, 120));

    if (!isComponentMounted.current) return;

    // 3. Launch active question listening session
    startListeningRef.current(false);
  }, []);

  // Start active speech recognition (used either from wake word, user tap, or follow-up listening)
  const startListening = useCallback(
    (isFollowUp = false) => {
      clearFollowUpTimer();
      clearQuestionWaitTimer();
      clearSpeechSilenceTimer();
      stopSpeech();
      setErrorMessage(null);
      isSubmittingRef.current = false;

      if (!isSpeechRecognitionSupported()) {
        setErrorMessage(
          'Speech recognition is not supported in this browser. Please open in Google Chrome on Android or desktop!'
        );
        return;
      }

      // Stop any background wake recognizer or previous session
      if (recognizerRef.current) {
        recognizerRef.current.abort();
        recognizerRef.current = null;
      }

      transcriptBufferRef.current = '';
      setLiveTranscript('');
      recognitionModeRef.current = isFollowUp ? 'follow_up' : 'active';
      setAssistantState(isFollowUp ? 'follow_up_listening' : 'listening');
      setDebugInfo((prev) => ({
        ...prev,
        wakeWordActive: false,
        recognizerStatus: isFollowUp
          ? 'FOLLOW_UP_LISTENING'
          : 'QUESTION_LISTENING',
      }));

      // Setup follow-up timer countdown if in follow-up mode
      if (isFollowUp) {
        const timeoutSeconds = settingsRef.current.followUpTimeoutSeconds || 4;
        setFollowUpRemaining(timeoutSeconds);

        let secondsLeft = timeoutSeconds;
        followUpTimerRef.current = setInterval(() => {
          secondsLeft -= 1;
          setFollowUpRemaining(secondsLeft);
          if (secondsLeft <= 0) {
            clearFollowUpTimer();
            if (recognizerRef.current) {
              recognizerRef.current.stop();
              recognizerRef.current = null;
            }
            setAssistantState('idle');
            setDebugInfo((prev) => ({
              ...prev,
              recognizerStatus: 'IDLE (Follow-up timeout expired)',
            }));
          }
        }, 1000);
      } else {
        // Question listening mode: wait up to 8s for user to speak their question
        questionWaitTimerRef.current = setTimeout(() => {
          if (!transcriptBufferRef.current.trim() && stateRef.current === 'listening') {
            if (recognizerRef.current) {
              recognizerRef.current.stop();
              recognizerRef.current = null;
            }
            setAssistantState('idle');
            setDebugInfo((prev) => ({
              ...prev,
              recognizerStatus: 'IDLE (Timed out waiting for question)',
            }));
          }
        }, 8000);
      }

      const recognizer = createSpeechRecognizer(
        settings.languagePreference,
        {
          onStart: () => {
            setMicPermission('granted');
            setDebugInfo((prev) => ({
              ...prev,
              micPermission: 'granted',
              wakeWordActive: false,
              recognizerStatus: isFollowUp
                ? 'FOLLOW_UP_LISTENING'
                : 'QUESTION_LISTENING',
            }));
          },
          onResult: (transcript, isFinal) => {
            if (isSubmittingRef.current) return;
            const clean = transcript.trim();
            if (!clean) return;

            transcriptBufferRef.current = clean;
            setLiveTranscript(clean);

            // Once user begins speaking, clear countdown and wait timers
            clearFollowUpTimer();
            clearQuestionWaitTimer();

            if (stateRef.current !== 'listening') {
              setAssistantState('listening');
            }

            setDebugInfo((prev) => ({
              ...prev,
              lastRecognizedSpeech: clean,
              lastRecognizedTimestamp: new Date().toLocaleTimeString(),
              recognizerStatus: `SPEECH_RECEIVED: "${clean}"`,
            }));

            // Debounce question finalization: 1.2s if final, 1.8s if interim
            clearSpeechSilenceTimer();
            speechSilenceTimerRef.current = setTimeout(() => {
              if (isSubmittingRef.current) return;
              const textToSubmit = transcriptBufferRef.current.trim();
              if (textToSubmit) {
                isSubmittingRef.current = true;
                if (recognizerRef.current) {
                  recognizerRef.current.stop();
                  recognizerRef.current = null;
                }
                setLiveTranscript('');
                submitToTiaRef.current(textToSubmit);
              }
            }, isFinal ? 1200 : 1800);
          },
          onError: (errMsg, errCode) => {
            // Ignore no-speech and aborted in question listening mode
            if (errCode === 'no-speech' || errCode === 'aborted') {
              return;
            }
            if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
              setMicPermission('denied');
              clearFollowUpTimer();
              clearQuestionWaitTimer();
              clearSpeechSilenceTimer();
              setErrorMessage(
                'Microphone access was denied. Please allow microphone access in browser settings.'
              );
              setAssistantState('idle');
              setDebugInfo((prev) => ({
                ...prev,
                micPermission: 'denied',
                recognizerStatus: 'ERROR: Microphone denied',
              }));
              return;
            }
            clearFollowUpTimer();
            clearQuestionWaitTimer();
            clearSpeechSilenceTimer();
            if (isFollowUp) {
              setAssistantState('idle');
            } else {
              setErrorMessage(errMsg);
              setAssistantState('idle');
              setDebugInfo((prev) => ({
                ...prev,
                recognizerStatus: `ERROR: ${errMsg}`,
              }));
            }
            setLiveTranscript('');
          },
          onEnd: () => {
            clearSpeechSilenceTimer();
            if (isSubmittingRef.current) return;
            if (stateRef.current === 'thinking' || stateRef.current === 'speaking') return;

            const buffered = transcriptBufferRef.current.trim();
            if (buffered) {
              isSubmittingRef.current = true;
              clearFollowUpTimer();
              clearQuestionWaitTimer();
              setLiveTranscript('');
              submitToTiaRef.current(buffered);
              return;
            }

            // If still in listening state and wait timer hasn't expired, restart recognizer
            if (
              (stateRef.current === 'listening' || stateRef.current === 'follow_up_listening') &&
              (questionWaitTimerRef.current || followUpTimerRef.current) &&
              isComponentMounted.current
            ) {
              setTimeout(() => {
                if (
                  (stateRef.current === 'listening' || stateRef.current === 'follow_up_listening') &&
                  !isSubmittingRef.current
                ) {
                  startListening(isFollowUp);
                }
              }, 100);
              return;
            }

            setAssistantState((current) =>
              current === 'listening' || current === 'follow_up_listening'
                ? 'idle'
                : current
            );
            setLiveTranscript('');
          },
        },
        { continuous: true, isWakeWordMode: false }
      );

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
      } else {
        setAssistantState('idle');
      }
    },
    [
      settings.languagePreference,
      stopSpeech,
      clearFollowUpTimer,
      clearQuestionWaitTimer,
      clearSpeechSilenceTimer,
    ]
  );
  startListeningRef.current = startListening;

  // Passive Hands-Free "Tia" & "Hey Tia" Wake-Word Listener loop
  const startWakeWordListener = useCallback(() => {
    if (!settings.handsFreeMode || !isSpeechRecognitionSupported()) {
      setDebugInfo((prev) => ({
        ...prev,
        wakeWordActive: false,
        recognizerStatus: !settings.handsFreeMode
          ? 'IDLE (Hands-free mode disabled in settings)'
          : 'ERROR (Speech recognition not supported)',
      }));
      return;
    }
    if (stateRef.current !== 'idle') return;

    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }

    recognitionModeRef.current = 'idle_wake';
    const activeLang =
      settings.languagePreference === 'english' ? 'en-IN' : 'hi-IN';

    setDebugInfo((prev) => ({
      ...prev,
      wakeWordActive: true,
      recognizerStatus: 'WAKE_WORD_LISTENING',
      activeLangCode: activeLang,
    }));

    const recognizer = createSpeechRecognizer(
      settings.languagePreference,
      {
        onStart: () => {
          setDebugInfo((prev) => ({
            ...prev,
            wakeWordActive: true,
            recognizerStatus: 'WAKE_WORD_LISTENING',
          }));
        },
        onResult: (transcript, isFinal) => {
          if (stateRef.current !== 'idle') return;

          setDebugInfo((prev) => ({
            ...prev,
            lastRecognizedSpeech: transcript,
            lastRecognizedTimestamp: new Date().toLocaleTimeString(),
          }));

          const match = detectWakeWord(transcript);
          if (match.detected) {
            setDebugInfo((prev) => ({
              ...prev,
              lastWakeDetected: `"${match.matchedPhrase || 'Tia'}" detected at ${new Date().toLocaleTimeString()}`,
              recognizerStatus: `WAKE_WORD_DETECTED: "${match.matchedPhrase || 'Tia'}"`,
            }));

            // 1. Play audio wake chime if enabled
            if (settingsRef.current.wakeChimeEnabled) {
              playWakeChime();
            }

            // 2. If single-breath question (e.g. "Tia, what is GDP?"):
            if (match.remainderQuery && match.remainderQuery.length > 2) {
              if (recognizerRef.current) {
                recognizerRef.current.abort();
                recognizerRef.current = null;
              }
              setAssistantState('thinking');
              setLastUserQuery(match.remainderQuery);
              setDebugInfo((prev) => ({
                ...prev,
                wakeWordActive: false,
                recognizerStatus: 'PROCESSING',
              }));
              submitToTiaRef.current(match.remainderQuery);
              return;
            }

            // 3. User said "Tia" or "Hey Tia" -> transition to QUESTION_LISTENING
            setAssistantState('wake_word_detected');
            transitionToQuestionListening();
          }
        },
        onError: (errMsg, errCode) => {
          if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
            setMicPermission('denied');
            setDebugInfo((prev) => ({
              ...prev,
              micPermission: 'denied',
              wakeWordActive: false,
              recognizerStatus: 'ERROR: Microphone permission denied',
            }));
          } else if (errCode === 'no-speech' || errCode === 'aborted') {
            // Normal standby behavior
          } else {
            setDebugInfo((prev) => ({
              ...prev,
              recognizerStatus: `Notice: ${errCode || errMsg}`,
            }));
          }
        },
        onEnd: () => {
          // Restart wake word listener if still in idle state and hands-free is enabled
          if (
            stateRef.current === 'idle' &&
            settingsRef.current.handsFreeMode &&
            isComponentMounted.current
          ) {
            wakeRestartTimerRef.current = setTimeout(() => {
              if (stateRef.current === 'idle' && settingsRef.current.handsFreeMode) {
                startWakeWordListener();
              }
            }, 250);
          }
        },
      },
      { continuous: true, isWakeWordMode: true }
    );

    if (recognizer) {
      recognizerRef.current = recognizer;
      recognizer.start();
    }
  }, [
    settings.handsFreeMode,
    settings.languagePreference,
    transitionToQuestionListening,
  ]);
  startWakeWordListenerRef.current = startWakeWordListener;

  // Simulate wake-word phrase for developer testing and verification
  const handleTestWakeWord = useCallback(
    (simulatedPhrase: string) => {
      setDebugInfo((prev) => ({
        ...prev,
        lastRecognizedSpeech: simulatedPhrase,
        lastRecognizedTimestamp: new Date().toLocaleTimeString(),
      }));

      const match = detectWakeWord(simulatedPhrase);
      if (match.detected) {
        setDebugInfo((prev) => ({
          ...prev,
          lastWakeDetected: `[TEST] "${match.matchedPhrase || simulatedPhrase}" detected at ${new Date().toLocaleTimeString()}`,
          recognizerStatus: `WAKE_WORD_DETECTED: "${match.matchedPhrase || simulatedPhrase}"`,
        }));

        if (settingsRef.current.wakeChimeEnabled) {
          playWakeChime();
        }

        if (match.remainderQuery && match.remainderQuery.length > 2) {
          if (recognizerRef.current) {
            recognizerRef.current.abort();
            recognizerRef.current = null;
          }
          setAssistantState('thinking');
          setLastUserQuery(match.remainderQuery);
          setDebugInfo((prev) => ({
            ...prev,
            wakeWordActive: false,
            recognizerStatus: 'PROCESSING',
          }));
          submitToTiaRef.current(match.remainderQuery);
        } else {
          setAssistantState('wake_word_detected');
          transitionToQuestionListening();
        }
      }
    },
    [transitionToQuestionListening]
  );

  // Auto-activate wake word listener on first user interaction if browser policy blocked auto-listening
  useEffect(() => {
    const handleGestureUnlock = () => {
      if (stateRef.current === 'idle' && settingsRef.current.handsFreeMode) {
        if (!recognizerRef.current) {
          startWakeWordListener();
        }
      }
    };
    window.addEventListener('click', handleGestureUnlock, { once: true });
    window.addEventListener('touchstart', handleGestureUnlock, { once: true });
    return () => {
      window.removeEventListener('click', handleGestureUnlock);
      window.removeEventListener('touchstart', handleGestureUnlock);
    };
  }, [startWakeWordListener]);

  // Manage Wake-Word Loop when assistant is idle
  useEffect(() => {
    if (assistantState === 'idle' && settings.handsFreeMode) {
      startWakeWordListener();
    } else if (assistantState !== 'idle' && recognitionModeRef.current === 'idle_wake') {
      if (recognizerRef.current) {
        recognizerRef.current.abort();
        recognizerRef.current = null;
      }
    }

    return () => {
      if (wakeRestartTimerRef.current) clearTimeout(wakeRestartTimerRef.current);
      if (wakeTransitionTimerRef.current) clearTimeout(wakeTransitionTimerRef.current);
    };
  }, [assistantState, settings.handsFreeMode, startWakeWordListener]);

  // Handle Voice Orb click (supports barge-in interruption)
  const handleOrbClick = useCallback(() => {
    if (assistantState === 'listening' || assistantState === 'follow_up_listening') {
      stopListening();
    } else if (assistantState === 'speaking') {
      // Barge-in: immediately stop speaking and switch to listening
      stopSpeech();
      startListening(false);
    } else if (assistantState === 'wake_word_detected') {
      startListening(false);
    } else if (assistantState === 'idle') {
      startListening(false);
    }
  }, [assistantState, startListening, stopListening, stopSpeech]);

  // Request explicit mic permission
  const handleRequestMicPermission = useCallback(async () => {
    const granted = await requestMicrophoneAccess();
    if (granted) {
      setMicPermission('granted');
      if (assistantState === 'idle' && settings.handsFreeMode) {
        startWakeWordListener();
      }
    } else {
      setMicPermission('denied');
      setErrorMessage(
        'Microphone permission is blocked. Please enable microphone permissions in your browser or site settings.'
      );
    }
  }, [assistantState, settings.handsFreeMode, startWakeWordListener]);

  // Test voice in settings
  const handleTestVoice = useCallback(() => {
    const sampleText = settings.funnyMode
      ? 'Namaste! Main hoon Tia, aapki funny Indian AI dost. Economics ho, GDP ho, ya mast ideas—sab bindaas poochho!'
      : 'Hello! I am Tia, your personal Indian voice assistant. How can I help you today?';
    speakResponse(
      sampleText,
      settings.funnyMode ? 'playful' : 'happy',
      'hinglish'
    );
  }, [settings.funnyMode, speakResponse]);

  // Reset conversation memory
  const handleClearConversation = useCallback(() => {
    clearFollowUpTimer();
    clearQuestionWaitTimer();
    clearSpeechSilenceTimer();
    stopSpeech();
    setMessages([]);
    setLastUserQuery(null);
    setLiveTranscript('');
    setErrorMessage(null);
    setAssistantState('idle');
  }, [stopSpeech, clearFollowUpTimer, clearQuestionWaitTimer, clearSpeechSilenceTimer]);

  // Update Owner Profile in persistent backend DB & local state
  const handleUpdateOwnerProfile = useCallback(
    async (updater: Partial<OwnerProfile>) => {
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updater),
        });
        const data = await res.json();
        if (data.profile) {
          setOwnerProfile(data.profile);
          localStorage.setItem('tia_owner_profile', JSON.stringify(data.profile));
        }
      } catch (err) {
        console.error('Failed to update owner profile:', err);
      }
    },
    []
  );

  // Add a persistent memory fact
  const handleAddMemory = useCallback(async (fact: string) => {
    try {
      const res = await fetch('/api/profile/remember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact, category: 'user_requested' }),
      });
      const data = await res.json();
      if (data.profile) {
        setOwnerProfile(data.profile);
        localStorage.setItem('tia_owner_profile', JSON.stringify(data.profile));
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
    }
  }, []);

  // Delete a persistent memory fact
  const handleDeleteMemory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/profile/memory?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.profile) {
        setOwnerProfile(data.profile);
        localStorage.setItem('tia_owner_profile', JSON.stringify(data.profile));
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  }, []);

  // Reset owner profile back to default Anurag profile
  const handleResetProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/reset', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.profile) {
        setOwnerProfile(data.profile);
        localStorage.setItem('tia_owner_profile', JSON.stringify(data.profile));
      }
    } catch (err) {
      console.error('Failed to reset profile:', err);
    }
  }, []);

  const lastAssistantMsg =
    [...messages].reverse().find((m) => m.role === 'assistant') || null;

  const isDark = settings.theme === 'dark';

  return (
    <main
      id="tia-app-root"
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Decorative background aura radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <Header
        settings={settings}
        onUpdateSettings={(updater) =>
          setSettings((prev) => ({ ...prev, ...updater }))
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDark={isDark}
        ownerProfile={ownerProfile}
      />

      {/* Error / Permission Toast Notification */}
      <ErrorMessage
        message={errorMessage}
        onDismiss={() => setErrorMessage(null)}
        onRetry={() => startListening(false)}
      />

      {/* Center Stage: Voice Orb & Floating Conversation */}
      <div className="flex-1 w-full max-w-xl mx-auto flex flex-col items-center justify-center px-4 overflow-y-auto">
        {/* Animated AI Voice Presence Orb */}
        <VoiceOrb
          state={assistantState}
          onClick={handleOrbClick}
          isDark={isDark}
          emotion={currentEmotion}
          currentVoiceLabel={currentVoiceName}
          followUpRemainingSeconds={followUpRemaining}
          handsFreeMode={settings.handsFreeMode}
        />

        {/* Minimalist Spoken Conversation Preview */}
        <ConversationPreview
          lastMessage={lastAssistantMsg}
          lastUserQuery={lastUserQuery}
          state={assistantState}
          onReplay={(msg) =>
            speakResponse(
              msg.content,
              msg.emotion,
              (msg.detectedLanguage as any) || 'hinglish'
            )
          }
          onStopSpeech={stopSpeech}
          onSelectPrompt={(prompt) => submitToTia(prompt)}
          allMessages={messages}
          isDark={isDark}
        />
      </div>

      {/* Bottom Voice Controls & Mic button */}
      <VoiceControls
        state={assistantState}
        onStartListening={() => startListening(false)}
        onStopListening={stopListening}
        onStopSpeech={() => {
          stopSpeech();
          startListening(false);
        }}
        onSubmitText={submitToTia}
        liveTranscript={liveTranscript}
        isDark={isDark}
        handsFreeMode={settings.handsFreeMode}
        followUpRemainingSeconds={followUpRemaining}
        micPermission={micPermission}
        onRequestMicPermission={handleRequestMicPermission}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(updater) =>
          setSettings((prev) => ({ ...prev, ...updater }))
        }
        onClearConversation={handleClearConversation}
        availableVoices={availableVoices}
        onTestVoice={handleTestVoice}
        isDark={isDark}
        ownerProfile={ownerProfile}
        onUpdateOwnerProfile={handleUpdateOwnerProfile}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onResetProfile={handleResetProfile}
        onAskTia={submitToTia}
      />

      {/* Real-time Hands-Free "Hey Tia" Diagnostics Bar */}
      <WakeWordDebugIndicator
        debugInfo={debugInfo}
        onTestWakeWord={handleTestWakeWord}
        onRestartListener={() => {
          if (assistantState === 'idle') {
            startWakeWordListener();
          }
        }}
        onRequestMic={handleRequestMicPermission}
        isDark={isDark}
      />
    </main>
  );
}

