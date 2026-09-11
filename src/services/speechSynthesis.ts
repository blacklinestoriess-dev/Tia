import type {
  SpeechVoiceOption,
  TiaEmotion,
  VoiceSelectionCriteria,
} from '../types';

/**
 * Acoustic prosody profiles for each emotion.
 * Controls pitch, speaking rate, inter-clause pause duration, and volume.
 */
export interface EmotionProsody {
  pitch: number;
  rateMultiplier: number;
  pauseDurationMs: number;
  volume: number;
}

export const EMOTION_PROSODY_MAP: Record<TiaEmotion, EmotionProsody> = {
  playful: {
    pitch: 1.15,
    rateMultiplier: 1.05,
    pauseDurationMs: 240,
    volume: 1.0,
  },
  funny: {
    pitch: 1.14,
    rateMultiplier: 1.06,
    pauseDurationMs: 260,
    volume: 1.0,
  },
  happy: {
    pitch: 1.16,
    rateMultiplier: 1.04,
    pauseDurationMs: 200,
    volume: 1.0,
  },
  excited: {
    pitch: 1.22,
    rateMultiplier: 1.12,
    pauseDurationMs: 160,
    volume: 1.0,
  },
  curious: {
    pitch: 1.08,
    rateMultiplier: 1.0,
    pauseDurationMs: 220,
    volume: 1.0,
  },
  calm: {
    pitch: 0.98,
    rateMultiplier: 0.92,
    pauseDurationMs: 320,
    volume: 0.95,
  },
  reassuring: {
    pitch: 0.96,
    rateMultiplier: 0.90,
    pauseDurationMs: 300,
    volume: 0.95,
  },
  empathetic: {
    pitch: 0.95,
    rateMultiplier: 0.88,
    pauseDurationMs: 340,
    volume: 0.95,
  },
  serious: {
    pitch: 0.92,
    rateMultiplier: 0.92,
    pauseDurationMs: 350,
    volume: 1.0,
  },
  neutral: {
    pitch: 1.02,
    rateMultiplier: 1.0,
    pauseDurationMs: 200,
    volume: 1.0,
  },
};

/**
 * Visual metadata for Tia's emotions (badges, colors, emojis)
 */
export interface EmotionVisualMeta {
  label: string;
  emoji: string;
  badgeClass: string;
  orbGlow: string;
}

export function getEmotionVisualMeta(emotion: string = 'neutral'): EmotionVisualMeta {
  switch (emotion) {
    case 'playful':
      return {
        label: 'Playful',
        emoji: '🎭',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        orbGlow: 'from-rose-500/40 via-pink-500/30 to-purple-600/30',
      };
    case 'funny':
      return {
        label: 'Witty',
        emoji: '😂',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        orbGlow: 'from-amber-500/40 via-orange-500/30 to-yellow-500/30',
      };
    case 'happy':
      return {
        label: 'Cheerful',
        emoji: '✨',
        badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        orbGlow: 'from-yellow-400/40 via-amber-500/30 to-orange-500/30',
      };
    case 'excited':
      return {
        label: 'Excited',
        emoji: '🚀',
        badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        orbGlow: 'from-orange-500/50 via-rose-500/40 to-yellow-400/30',
      };
    case 'curious':
      return {
        label: 'Curious',
        emoji: '🤔',
        badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        orbGlow: 'from-indigo-500/40 via-blue-500/30 to-violet-500/30',
      };
    case 'calm':
      return {
        label: 'Calm',
        emoji: '🌿',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        orbGlow: 'from-emerald-500/40 via-teal-500/30 to-cyan-500/30',
      };
    case 'reassuring':
      return {
        label: 'Reassuring',
        emoji: '🤝',
        badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
        orbGlow: 'from-teal-500/40 via-emerald-500/30 to-cyan-600/30',
      };
    case 'empathetic':
      return {
        label: 'Empathetic',
        emoji: '💙',
        badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        orbGlow: 'from-sky-500/40 via-blue-500/30 to-indigo-500/30',
      };
    case 'serious':
      return {
        label: 'Focused',
        emoji: '🛡️',
        badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        orbGlow: 'from-slate-500/40 via-blue-900/30 to-indigo-900/30',
      };
    case 'neutral':
    default:
      return {
        label: 'Friendly',
        emoji: '💬',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        orbGlow: 'from-purple-500/40 via-indigo-500/30 to-pink-500/30',
      };
  }
}

/**
 * Cleans and conditions text before sending it to speech synthesis.
 * Strips markdown symbols, URLs, and code blocks.
 * Expands common Indian abbreviations so speech synthesizers enunciate cleanly.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown bold/italic
      .replace(/[*_~]{1,3}/g, '')
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove blockquotes and list markers
      .replace(/^>\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Currency expansion
      .replace(/₹\s*(\d+)/g, '$1 rupees')
      .replace(/Rs\.?\s*(\d+)/gi, '$1 rupees')
      .replace(/%/g, ' percent')
      .replace(/&/g, ' and ')
      .replace(/\+/g, ' plus ')
      .replace(/=/g, ' equals ')
      // Expand common acronyms for crisp letter pronunciation in TTS
      .replace(/\bGDP\b/g, 'G D P')
      .replace(/\bUPI\b/g, 'U P I')
      .replace(/\bRBI\b/g, 'R B I')
      .replace(/\bIPL\b/g, 'I P L')
      .replace(/\bAI\b/g, 'A I')
      .replace(/\bIIT\b/g, 'I I T')
      .replace(/\bIIM\b/g, 'I I M')
      .replace(/\bGST\b/g, 'G S T')
      .replace(/\bCEO\b/g, 'C E O')
      .replace(/\bOTP\b/g, 'O T P')
      // Strip emojis (standard Unicode emoji ranges)
      .replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
        ''
      )
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Breaks cleaned text into natural conversational clauses and sentences.
 * This prevents monotone continuous rush and allows natural breathing pauses.
 */
export function segmentSpeechText(text: string): Array<{ text: string; isQuestion: boolean }> {
  if (!text) return [];

  // Match sentences ending in punctuation or newlines
  const rawSegments = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const results: Array<{ text: string; isQuestion: boolean }> = [];

  for (const raw of rawSegments) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const isQuestion = trimmed.endsWith('?');
    results.push({
      text: trimmed,
      isQuestion,
    });
  }

  return results;
}

/**
 * Discovers and prioritizes natural Indian voices on the device.
 */
export function getAvailableVoices(): SpeechVoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  const options: SpeechVoiceOption[] = [];

  for (const v of voices) {
    const langLower = v.lang.toLowerCase();
    const nameLower = v.name.toLowerCase();

    const isIndianLang =
      langLower.includes('en-in') ||
      langLower.includes('hi-in') ||
      langLower.includes('hi_in') ||
      langLower.includes('en_in');

    const isIndianName =
      nameLower.includes('india') ||
      nameLower.includes('hindi') ||
      nameLower.includes('neerja') ||
      nameLower.includes('swara') ||
      nameLower.includes('heera') ||
      nameLower.includes('lekha') ||
      nameLower.includes('kalpana') ||
      nameLower.includes('ananya') ||
      nameLower.includes('prabhat') ||
      nameLower.includes('ravi');

    const isFemale =
      nameLower.includes('female') ||
      nameLower.includes('woman') ||
      nameLower.includes('neerja') ||
      nameLower.includes('swara') ||
      nameLower.includes('heera') ||
      nameLower.includes('lekha') ||
      nameLower.includes('kalpana') ||
      nameLower.includes('zira') ||
      nameLower.includes('samantha') ||
      nameLower.includes('karen') ||
      nameLower.includes('victoria');

    const isMale =
      nameLower.includes('male') ||
      nameLower.includes('man') ||
      nameLower.includes('prabhat') ||
      nameLower.includes('ravi') ||
      nameLower.includes('david') ||
      nameLower.includes('guy') ||
      nameLower.includes('george');

    const isNatural =
      nameLower.includes('natural') ||
      nameLower.includes('online') ||
      nameLower.includes('neural') ||
      nameLower.includes('google');

    options.push({
      name: v.name,
      lang: v.lang,
      voiceURI: v.voiceURI,
      isIndian: isIndianLang || isIndianName,
      isFemale,
      isMale,
      isNatural,
    });
  }

  // Sort: Indian female voices first, then Indian male/other, then natural voices
  return options.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.isIndian) scoreA += 10;
    if (b.isIndian) scoreB += 10;

    if (a.isFemale) scoreA += 4;
    if (b.isFemale) scoreB += 4;

    if (a.isNatural) scoreA += 3;
    if (b.isNatural) scoreB += 3;

    return scoreB - scoreA;
  });
}

/**
 * Intelligently chooses the best voice instance based on:
 * - Language (Hindi, Hinglish, English)
 * - Emotion & conversation context (playful vs serious vs educational)
 * - Gender appropriateness (default female for Tia, male for dramatic or requested context)
 * - Natural/Neural engine priority
 */
export function selectContextualVoice(
  criteria: VoiceSelectionCriteria,
  availableVoices?: SpeechSynthesisVoice[]
): { voice: SpeechSynthesisVoice | null; voiceLabel: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, voiceLabel: 'Default System Voice' };
  }

  const voices = availableVoices && availableVoices.length > 0
    ? availableVoices
    : window.speechSynthesis.getVoices();

  if (voices.length === 0) {
    return { voice: null, voiceLabel: 'System Voice' };
  }

  // 1. If user explicitly locked a voice in Settings and autoVoiceSelection is disabled
  if (criteria.userPreferenceURI) {
    const lockedMatch = voices.find((v) => v.voiceURI === criteria.userPreferenceURI);
    if (lockedMatch) {
      return { voice: lockedMatch, voiceLabel: lockedMatch.name };
    }
  }

  const { detectedLanguage, emotion, preferredGender } = criteria;

  // Score each voice against current criteria
  let bestScore = -1;
  let bestVoice: SpeechSynthesisVoice | null = null;

  for (const v of voices) {
    let score = 0;
    const l = v.lang.toLowerCase();
    const n = v.name.toLowerCase();

    const isIndian =
      l.includes('in') ||
      l.includes('hi') ||
      n.includes('india') ||
      n.includes('hindi') ||
      n.includes('neerja') ||
      n.includes('swara') ||
      n.includes('prabhat') ||
      n.includes('ravi');

    const isFemale =
      n.includes('female') ||
      n.includes('woman') ||
      n.includes('neerja') ||
      n.includes('swara') ||
      n.includes('heera') ||
      n.includes('lekha') ||
      n.includes('kalpana') ||
      n.includes('samantha');

    const isMale =
      n.includes('male') ||
      n.includes('prabhat') ||
      n.includes('ravi') ||
      n.includes('david') ||
      n.includes('guy');

    const isNeural =
      n.includes('natural') ||
      n.includes('online') ||
      n.includes('neural') ||
      n.includes('google');

    // Language matching
    if (detectedLanguage === 'hindi') {
      if (l.startsWith('hi') || n.includes('hindi')) {
        score += 30;
      } else if (isIndian) {
        score += 15;
      }
    } else if (detectedLanguage === 'english') {
      if (l.includes('en-in') || (isIndian && l.startsWith('en'))) {
        score += 30;
      } else if (l.startsWith('en')) {
        score += 10;
      }
    } else {
      // Hinglish: neural Indian voices excel at mixed vocabulary
      if (isIndian) {
        score += 25;
        if (l.includes('en-in') || l.includes('hi-in')) score += 10;
      }
    }

    // Neural / Natural voices sound vastly more expressive and human
    if (isNeural) {
      score += 12;
    }

    // Gender matching:
    // If male requested (e.g. dramatic / specific context), boost Indian male
    if (preferredGender === 'male') {
      if (isMale) score += 20;
    } else {
      // Default to female for Tia's signature identity
      if (isFemale) score += 12;
      else if (isMale) score -= 5;
    }

    // Emotion resonance:
    // For serious or calm topics, mature voices like Swara or deep Indian timbre score higher
    if (emotion === 'serious' || emotion === 'calm' || emotion === 'reassuring') {
      if (n.includes('swara') || n.includes('mature') || isNeural) score += 5;
    }
    // For playful or excited topics, high-clarity expressive voices score higher
    if (emotion === 'playful' || emotion === 'funny' || emotion === 'excited') {
      if (n.includes('neerja') || n.includes('natural') || isNeural) score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestVoice = v;
    }
  }

  // Fallback if no voice scored
  if (!bestVoice) {
    bestVoice = voices[0] || null;
  }

  return {
    voice: bestVoice,
    voiceLabel: bestVoice?.name || 'Tia Voice',
  };
}

/**
 * Controller interface for an active speech session
 */
export interface SpeechSessionController {
  cancel: () => void;
}

/**
 * Speaks text naturally using emotion-aware prosody, utterance segmentation,
 * and conversational pauses.
 */
export function speakEmotionally({
  text,
  emotion = 'neutral',
  voice,
  baseRate = 1.0,
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  emotion?: TiaEmotion;
  voice: SpeechSynthesisVoice | null;
  baseRate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}): SpeechSessionController {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return { cancel: () => {} };
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    onEnd?.();
    return { cancel: () => {} };
  }

  const segments = segmentSpeechText(cleaned);
  if (segments.length === 0) {
    onEnd?.();
    return { cancel: () => {} };
  }

  const prosody = EMOTION_PROSODY_MAP[emotion] || EMOTION_PROSODY_MAP.neutral;
  let isCancelled = false;
  let currentSegmentIndex = 0;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    isCancelled = true;
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakNextSegment = () => {
    if (isCancelled) return;

    if (currentSegmentIndex >= segments.length) {
      onEnd?.();
      return;
    }

    const { text: segText, isQuestion } = segments[currentSegmentIndex];
    const utterance = new SpeechSynthesisUtterance(segText);

    if (voice) {
      utterance.voice = voice;
      // Set utterance language to match voice language for optimal phonetics
      utterance.lang = voice.lang;
    }

    // Dynamic emotion rate and pitch
    const calculatedRate = Math.max(0.65, Math.min(1.5, baseRate * prosody.rateMultiplier));
    utterance.rate = calculatedRate;

    // Slight rising inflection for questions
    let segmentPitch = prosody.pitch;
    if (isQuestion) {
      segmentPitch = Math.min(1.35, segmentPitch + 0.08);
    }
    utterance.pitch = Math.max(0.7, Math.min(1.4, segmentPitch));
    utterance.volume = prosody.volume;

    utterance.onstart = () => {
      if (currentSegmentIndex === 0) {
        onStart?.();
      }
    };

    utterance.onend = () => {
      if (isCancelled) return;
      currentSegmentIndex++;

      if (currentSegmentIndex < segments.length) {
        // Natural breath pause between sentences/thoughts
        pauseTimer = setTimeout(() => {
          speakNextSegment();
        }, prosody.pauseDurationMs);
      } else {
        onEnd?.();
      }
    };

    utterance.onerror = (e) => {
      // Don't treat user interruption / cancel as an error
      if (e.error === 'canceled' || e.error === 'interrupted' || isCancelled) {
        return;
      }
      console.warn('Speech segment error:', e);
      onError?.(e);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start speaking first segment
  speakNextSegment();

  return { cancel };
}
