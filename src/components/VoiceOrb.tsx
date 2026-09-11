import React from 'react';
import type { AssistantState, TiaEmotion } from '../types';
import { Mic, Sparkles, Volume2 } from 'lucide-react';
import { getEmotionVisualMeta } from '../services/speechSynthesis';

interface VoiceOrbProps {
  state: AssistantState;
  onClick: () => void;
  isDark: boolean;
  emotion?: TiaEmotion;
  currentVoiceLabel?: string;
  followUpRemainingSeconds?: number;
  handsFreeMode?: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  onClick,
  isDark,
  emotion = 'neutral',
  currentVoiceLabel,
  followUpRemainingSeconds,
  handsFreeMode = true,
}) => {
  const emotionMeta = getEmotionVisualMeta(emotion);

  return (
    <div className="relative flex flex-col items-center justify-center my-auto py-2">
      {/* Outer ambient glow field - shifts dynamically with Tia's speaking emotion and hands-free states */}
      <div
        className={`absolute w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
          state === 'wake_word_detected'
            ? 'bg-amber-400/40 scale-140 opacity-100'
            : state === 'listening'
            ? 'bg-rose-500/30 scale-125'
            : state === 'follow_up_listening'
            ? 'bg-cyan-500/35 scale-125 opacity-90'
            : state === 'thinking'
            ? 'bg-amber-500/25 scale-115'
            : state === 'speaking'
            ? `${emotionMeta.orbGlow} scale-130 opacity-90`
            : isDark
            ? 'bg-rose-600/15 scale-100'
            : 'bg-rose-300/25 scale-100'
        }`}
      />

      {/* Interactive Orb Container */}
      <button
        type="button"
        id="voice-orb-button"
        onClick={onClick}
        aria-label={
          state === 'wake_word_detected'
            ? 'Waking up'
            : state === 'listening' || state === 'follow_up_listening'
            ? 'Stop listening'
            : state === 'speaking'
            ? 'Interrupt speaking'
            : 'Tap to speak to Tia'
        }
        className="group relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/50 rounded-full transition-transform duration-300 active:scale-95"
      >
        {/* Layer 1: Ambient Outer Pulsing Ring */}
        <div
          className={`absolute inset-0 rounded-full border transition-all duration-700 ${
            state === 'wake_word_detected'
              ? 'border-amber-400 scale-120 animate-ping opacity-75'
              : state === 'listening'
              ? 'border-rose-500/60 scale-110 animate-listening-pulse'
              : state === 'follow_up_listening'
              ? 'border-cyan-400/70 scale-110 animate-pulse border-dashed'
              : state === 'thinking'
              ? 'border-amber-400/50 scale-105 animate-spin-slow border-dashed'
              : state === 'speaking'
              ? 'border-rose-400/60 scale-110 animate-pulse'
              : isDark
              ? 'border-white/10 scale-100 group-hover:border-rose-500/40'
              : 'border-slate-300 scale-100 group-hover:border-rose-400'
          }`}
        />

        {/* Layer 2: Secondary Orbital Rings for Thinking, Follow-up, & Speaking */}
        {state === 'thinking' && (
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-400 border-r-rose-400 animate-spin-reverse-slow opacity-80" />
        )}

        {state === 'follow_up_listening' && (
          <div className="absolute inset-2 rounded-full border-2 border-cyan-400/40 animate-spin-slow" />
        )}

        {state === 'speaking' && (
          <div className="absolute inset-3 rounded-full border border-rose-400/40 animate-ping opacity-30" />
        )}

        {/* Layer 3: Main Glowing Orb Body */}
        <div
          className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full transition-all duration-500 flex items-center justify-center shadow-2xl overflow-hidden ${
            state === 'wake_word_detected'
              ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-yellow-300 shadow-amber-500/60 scale-105'
              : state === 'listening'
              ? 'animate-listening-pulse bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 shadow-rose-500/50'
              : state === 'follow_up_listening'
              ? 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-rose-500 shadow-cyan-500/40 animate-pulse'
              : state === 'thinking'
              ? 'animate-spin-slow bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 shadow-amber-500/40'
              : state === 'speaking'
              ? 'bg-gradient-to-tr from-violet-600 via-rose-500 to-amber-500 animate-pulse shadow-rose-500/50'
              : 'animate-breathe bg-gradient-to-tr from-rose-600 via-rose-500 to-violet-600 shadow-rose-600/30'
          }`}
        >
          {/* Internal Specular Highlight / Glass Sheen */}
          <div className="absolute top-2 left-4 w-16 h-8 rounded-full bg-white/35 blur-[2px] transform -rotate-25 pointer-events-none" />

          {/* Internal Particle Shimmer Gradient */}
          <div className="absolute inset-0 bg-radial from-white/20 via-transparent to-black/30 mix-blend-overlay" />

          {/* Core Visualizer Icon / State Animation */}
          <div className="relative z-10 flex flex-col items-center justify-center text-white">
            {state === 'idle' && (
              <div className="flex flex-col items-center">
                <Mic className="w-8 h-8 opacity-90 transition-transform group-hover:scale-110" />
                <span className="text-[10px] tracking-wider uppercase font-medium mt-1 text-white/80">
                  {handsFreeMode ? '"Hey Tia"' : 'Tap to speak'}
                </span>
              </div>
            )}

            {state === 'wake_word_detected' && (
              <div className="flex flex-col items-center animate-bounce">
                <Sparkles className="w-9 h-9 text-amber-100" />
                <span className="text-[10px] tracking-wider uppercase font-bold mt-1 text-white drop-shadow-md">
                  Hey Tia!
                </span>
              </div>
            )}

            {(state === 'listening' || state === 'follow_up_listening') && (
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1.5 h-9">
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-1" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-2" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-3" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-4" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-5" />
                </div>
                {state === 'follow_up_listening' && followUpRemainingSeconds !== undefined && (
                  <span className="text-[10px] tracking-wider font-mono font-bold mt-1 bg-black/30 px-2 py-0.5 rounded-full text-cyan-200">
                    {followUpRemainingSeconds}s
                  </span>
                )}
              </div>
            )}

            {state === 'thinking' && (
              <div className="flex flex-col items-center">
                <Sparkles className="w-8 h-8 animate-spin-slow text-amber-100" />
                <span className="text-[10px] tracking-wider uppercase font-semibold mt-1 text-amber-100">
                  Thinking
                </span>
              </div>
            )}

            {state === 'speaking' && (
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1 h-8 mb-1">
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-2" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-4" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-1" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-3" />
                  <div className="w-1.5 bg-white rounded-full animate-soundwave-5" />
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-white/90">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  <span className="font-medium">
                    {emotionMeta.emoji} {emotionMeta.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* State label & Presence text */}
      <div className="mt-4 text-center select-none space-y-1 max-w-xs px-2">
        <p
          className={`text-sm font-medium tracking-wide transition-colors ${
            state === 'wake_word_detected'
              ? 'text-amber-400 font-bold'
              : state === 'listening'
              ? 'text-rose-400 font-semibold'
              : state === 'follow_up_listening'
              ? 'text-cyan-400 font-semibold'
              : state === 'thinking'
              ? 'text-amber-400 font-semibold'
              : state === 'speaking'
              ? 'text-rose-400 font-semibold'
              : isDark
              ? 'text-slate-400'
              : 'text-slate-600'
          }`}
        >
          {state === 'wake_word_detected' && "Waking up! I'm listening..."}
          {state === 'listening' && 'Listening to you... (Speak naturally)'}
          {state === 'follow_up_listening' &&
            `Listening for follow-up (${followUpRemainingSeconds ?? 4}s) • Ask anything`}
          {state === 'thinking' && 'Tia is thinking...'}
          {state === 'speaking' && `Tia is speaking • Tap orb to interrupt`}
          {state === 'idle' &&
            (handsFreeMode
              ? 'Say "Hey Tia" or tap orb to speak'
              : 'Tap orb or mic to speak')}
        </p>

        {/* Current Voice label when speaking or active */}
        {state === 'speaking' && currentVoiceLabel && (
          <p className="text-[11px] text-slate-400 font-mono tracking-tight">
            Voice: {currentVoiceLabel}
          </p>
        )}
      </div>
    </div>
  );
};
