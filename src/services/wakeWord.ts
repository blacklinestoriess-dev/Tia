/**
 * Wake Word and Audio Cue services for Tia Assistant.
 * Provides on-device "Hey Tia" wake phrase spotting, natural audio chimes,
 * and browser microphone permission management.
 */

export interface WakeWordMatch {
  detected: boolean;
  remainderQuery: string;
  matchedPhrase?: string;
}

/**
 * Checks if a transcript begins with or contains the "Tia" or "Hey Tia" wake phrase.
 * Robust to natural speaking speed, small pauses, different pronunciations, capitalization,
 * and punctuation variations across Hindi, Hinglish, and English.
 * 
 * Supports:
 * - "Tia" (standalone - "Hey" is NOT required)
 * - "Hey Tia", "Hey, Tia", "Hi Tia", "Hello Tia"
 * - "Tia suno", "Tia suniye", "Tia ek baat batao"
 * - "Hey Tia, suno"
 * - "Tiya", "Hey Tiya", "Tea"
 * - Devanagari: "टिया", "टीया", "हे टिया", "सुनो टिया", "टिया सुनो", "टिया एक बात बताओ"
 */
export function detectWakeWord(transcript: string): WakeWordMatch {
  if (!transcript) return { detected: false, remainderQuery: '' };
  const text = transcript.trim();
  if (!text) return { detected: false, remainderQuery: '' };

  // Common optional filler words at start of phrase
  const optionalFiller = '(?:(?:um|uh|ah|so|aur|and)\\b[\\s,.:;!?\'"’\\-—]*)*';

  // Optional salutation prefix (Hey, Hi, Hello, Suno, Arre, Ok, etc.)
  const optionalGreeting =
    '(?:(?:hey|hay|aye|ay|hi|hello|ok|okay|suno|sun|arre|are|ohe|oye|accha|acha)\\b[\\s,.:;!?\'"’\\-—]*)*';

  // Tia's name variants: focused specifically on Tia/Tiya/Tea
  const tiaName = '\\b(?:tia|tiya|tea|teea|thea|thia|tya|diya|dia|teeya|tiah)\\b';

  // Attention suffixes (e.g. "suno", "sun", "suniye", "ek baat batao", "bolo", "batao", "bataiye")
  const optionalAttentionSuffix =
    '(?:[\\s,.:;!?\'"’\\-—]*(?:suno|sun|suniye|ji|bolo|batao|bataiye|ek\\s+baat\\s+batao|ek\\s+baat\\s+bata|listen)\\b)*';

  // 1. Primary Latin Regex:
  const latinRegex = new RegExp(
    `^${optionalFiller}${optionalGreeting}(${tiaName})${optionalAttentionSuffix}(?:[\\s,.:;!?\'"’\\-—]+(.*)|$)`,
    'i'
  );

  // 2. Hindi Devanagari Regex:
  const hindiRegex =
    /^(?:(?:हे|हाय|हैलो|हेलो|सुनो|अरे|अर्रे|ओके|अच्छा)[\s,.:;!?'"’\-—]*)*(टिया|टीया|तीया|दिया|दीया|डिया|तिया)(?:[\s,.:;!?'"’\-—]*(?:सुनो|सुनिए|जी|बोलो|बताओ|बताइए|एक\s+बात\s+बताओ))*(?:[\s,.:;!?'"’\-—]+(.*)|$)/u;

  // 3. Embedded in phrase (if user said something before Tia)
  const embeddedLatin =
    /(?:hey|hay|aye|hi|hello|suno|arre)?[\s,.:;!?'"’\-—]*\b(tia|tiya|tea|teea|thea|thia|diya)\b(?:[\s,.:;!?'"’\-—]*(?:suno|sun|suniye|ji|bolo|batao|ek\s+baat\s+batao))?(?:[\s,.:;!?'"’\-—]+(.*)|$)/i;

  const embeddedHindi =
    /(?:हे|हाय|हैलो|हेलो|सुनो|अरे)?[\s,.:;!?'"’\-—]*(टिया|टीया|तीया|दिया)(?:[\s,.:;!?'"’\-—]*(?:सुनो|सुनिए|जी|बोलो|बताओ|एक\s+बात\s+बताओ))?(?:[\s,.:;!?'"’\-—]+(.*)|$)/u;

  let m = text.match(latinRegex);
  if (m) {
    const rawRemainder = m[2] || '';
    const cleaned = cleanRemainder(rawRemainder);
    const matchedPart = text.slice(0, text.length - rawRemainder.length).trim();
    return {
      detected: true,
      remainderQuery: cleaned,
      matchedPhrase: matchedPart || 'Tia',
    };
  }

  m = text.match(hindiRegex);
  if (m) {
    const rawRemainder = m[2] || '';
    const cleaned = cleanRemainder(rawRemainder);
    const matchedPart = text.slice(0, text.length - rawRemainder.length).trim();
    return {
      detected: true,
      remainderQuery: cleaned,
      matchedPhrase: matchedPart || 'टिया',
    };
  }

  m = text.match(embeddedLatin);
  if (m) {
    const rawRemainder = m[2] || '';
    const cleaned = cleanRemainder(rawRemainder);
    return {
      detected: true,
      remainderQuery: cleaned,
      matchedPhrase: 'Tia (embedded)',
    };
  }

  m = text.match(embeddedHindi);
  if (m) {
    const rawRemainder = m[2] || '';
    const cleaned = cleanRemainder(rawRemainder);
    return {
      detected: true,
      remainderQuery: cleaned,
      matchedPhrase: 'हे टिया (embedded)',
    };
  }

  return { detected: false, remainderQuery: '' };
}

function cleanRemainder(str: string | undefined): string {
  if (!str) return '';
  let cleaned = str.replace(/^[\s,.:;!?'"’\-—]+/, '').trim();
  // Strip any remaining conversational openers that are not questions
  cleaned = cleaned
    .replace(
      /^(?:suno|sun|suniye|ji|bolo|batao|bataiye|ek\s+baat\s+batao|ek\s+baat\s+bata|listen|सुनो|सुनिए|जी|बोलो|बताओ|बताइए|एक\s+बात\s+बताओ)[\s,.:;!?'"’\-—]*/i,
      ''
    )
    .trim();
  cleaned = cleaned.replace(/^[\s,.:;!?'"’\-—]+/, '').trim();
  return cleaned;
}

/**
 * Plays a pleasant, subtle two-tone audio wake chime via Web Audio API.
 * This gives instantaneous auditory confirmation to the user that Tia woke up.
 */
export function playWakeChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Ascending major fifth chord tones (D5 587.33Hz -> A5 880Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.16, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.18, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.24);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);

    // Auto-close audio context to conserve mobile resources
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch (err) {
    console.warn('Notice: Wake chime playback skipped:', err);
  }
}

/**
 * Checks current browser microphone permission state.
 */
export async function checkMicrophonePermission(): Promise<
  'granted' | 'denied' | 'prompt' | 'unsupported'
> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.permissions ||
    !navigator.permissions.query
  ) {
    return 'unsupported';
  }

  try {
    const status = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    return status.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unsupported';
  }
}

/**
 * Requests microphone permission explicitly from the user via getUserMedia.
 */
export async function requestMicrophoneAccess(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately stop tracks; we only needed to verify/trigger permission
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
