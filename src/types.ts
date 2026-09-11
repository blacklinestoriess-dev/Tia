export type AssistantState =
  | 'idle'
  | 'wake_word_detected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'follow_up_listening';

export type TiaEmotion =
  | 'neutral'
  | 'happy'
  | 'playful'
  | 'funny'
  | 'excited'
  | 'curious'
  | 'calm'
  | 'serious'
  | 'empathetic'
  | 'reassuring';

export type ContextType =
  | 'chat'
  | 'educational'
  | 'humor'
  | 'serious'
  | 'exciting'
  | 'advice';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  emotion?: TiaEmotion;
  voiceName?: string;
  detectedLanguage?: 'hindi' | 'hinglish' | 'english';
}

export type LanguagePreference = 'auto' | 'hinglish' | 'hindi' | 'english';

export interface TiaSettings {
  voiceEnabled: boolean;
  speechRate: number;
  languagePreference: LanguagePreference;
  funnyMode: boolean;
  theme: 'dark' | 'light';
  selectedVoiceURI: string;
  autoVoiceSelection: boolean;
  // Hands-free & Wake word configurations
  handsFreeMode: boolean;
  followUpTimeoutSeconds: number; // 3 to 5 seconds, default 4
  wakeChimeEnabled: boolean;
}

export interface SpeechVoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  isIndian: boolean;
  isFemale: boolean;
  isMale: boolean;
  isNatural: boolean;
}

export interface VoiceSelectionCriteria {
  emotion: TiaEmotion;
  detectedLanguage: 'hindi' | 'hinglish' | 'english';
  contextType?: ContextType;
  preferredGender?: 'female' | 'male' | 'any';
  userPreferenceURI?: string;
}

export interface OwnerMemory {
  id: string;
  fact: string;
  category?: 'work' | 'personal' | 'preference' | 'identity' | 'general' | 'user_requested';
  createdAt: string;
  updatedAt?: string;
}

export interface OwnerProfile {
  name: string;
  relationship: 'owner';
  location: string;
  occupation_status: string;
  personality_traits: string[];
  additional_memories: OwnerMemory[];
  custom_fields?: Record<string, string>;
  last_updated: string;
}
