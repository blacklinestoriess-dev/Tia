import React, { useState } from 'react';
import type { AssistantState } from '../types';
import { Mic, MicOff, Send, Keyboard, X, ArrowUp } from 'lucide-react';

interface VoiceControlsProps {
  state: AssistantState;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeech: () => void;
  onSubmitText: (text: string) => void;
  liveTranscript: string;
  isDark: boolean;
  handsFreeMode?: boolean;
  followUpRemainingSeconds?: number;
  micPermission?: 'granted' | 'denied' | 'prompt' | 'unsupported';
  onRequestMicPermission?: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  onStartListening,
  onStopListening,
  onStopSpeech,
  onSubmitText,
  liveTranscript,
  isDark,
  handsFreeMode = true,
  followUpRemainingSeconds,
  micPermission = 'prompt',
  onRequestMicPermission,
}) => {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [typedInput, setTypedInput] = useState('');

  const handleMicClick = () => {
    if (state === 'listening' || state === 'follow_up_listening') {
      onStopListening();
    } else if (state === 'speaking') {
      onStopSpeech();
    } else if (state === 'idle') {
      onStartListening();
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = typedInput.trim();
    if (!clean) return;
    onSubmitText(clean);
    setTypedInput('');
    setShowKeyboard(false);
  };

  const isListeningState = state === 'listening' || state === 'follow_up_listening';

  return (
    <div className="w-full max-w-xl mx-auto px-4 pb-6 pt-2 flex flex-col items-center z-20">
      {/* Live transcript indicator when speech recognition is actively capturing words */}
      {isListeningState && liveTranscript && (
        <div
          id="live-transcript-bubble"
          className="mb-3 px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/40 backdrop-blur-md text-xs sm:text-sm font-medium text-rose-300 max-w-md text-center shadow-lg animate-fade-in"
        >
          <span className="opacity-75 text-[11px] uppercase mr-1">Listening:</span>
          "{liveTranscript}"
        </div>
      )}

      {/* Mic Permission Prompt if user has not yet granted microphone */}
      {micPermission === 'prompt' && state === 'idle' && (
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center space-x-2 text-xs text-amber-300">
          <span>Allow mic for "Hey Tia" wake word</span>
          {onRequestMicPermission && (
            <button
              type="button"
              id="btn-allow-mic-prompt"
              onClick={onRequestMicPermission}
              className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 cursor-pointer text-[11px]"
            >
              Enable Mic
            </button>
          )}
        </div>
      )}

      {/* Main Action Bar */}
      <div className="relative w-full flex items-center justify-center">
        {/* Left Side: Keyboard Fallback Toggle */}
        <button
          type="button"
          id="btn-toggle-keyboard"
          onClick={() => setShowKeyboard(!showKeyboard)}
          className={`absolute left-4 p-3 rounded-full transition-all duration-200 cursor-pointer ${
            showKeyboard
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : isDark
              ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300'
          }`}
          title={showKeyboard ? 'Hide keyboard' : 'Type a question'}
          aria-label={showKeyboard ? 'Close text input' : 'Open text input'}
        >
          {showKeyboard ? <X className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
        </button>

        {/* Center: Prominent Microphone Button */}
        <div className="relative flex flex-col items-center">
          {/* Animated concentric ripples during listening */}
          {isListeningState && (
            <div
              className={`absolute inset-0 -m-3 rounded-full border-2 animate-ping pointer-events-none ${
                state === 'follow_up_listening'
                  ? 'border-cyan-400/50 opacity-50'
                  : 'border-rose-500/50 opacity-60'
              }`}
            />
          )}

          <button
            type="button"
            id="btn-mic-main"
            onClick={handleMicClick}
            disabled={state === 'thinking' || state === 'wake_word_detected'}
            aria-label={
              isListeningState
                ? 'Finish speaking'
                : state === 'speaking'
                ? 'Interrupt speech'
                : 'Start speaking'
            }
            className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center cursor-pointer shadow-xl transition-all duration-300 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/50 ${
              state === 'wake_word_detected'
                ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-amber-500/60 scale-105'
                : state === 'follow_up_listening'
                ? 'bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-cyan-500/50 scale-105 animate-pulse'
                : state === 'listening'
                ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-rose-500/60 scale-105 animate-pulse'
                : state === 'thinking'
                ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-amber-100 shadow-amber-500/30 cursor-wait opacity-85'
                : state === 'speaking'
                ? 'bg-gradient-to-tr from-violet-600 to-rose-600 text-white shadow-violet-500/50 hover:scale-105'
                : 'bg-gradient-to-tr from-rose-500 to-violet-600 text-white shadow-rose-500/30 hover:scale-105 hover:shadow-rose-500/50'
            }`}
          >
            {isListeningState ? (
              <MicOff className="w-8 h-8" />
            ) : state === 'speaking' ? (
              <div className="flex flex-col items-center justify-center">
                <span className="w-4 h-4 rounded-xs bg-white mb-0.5" />
                <span className="text-[9px] uppercase font-bold tracking-wider">Stop</span>
              </div>
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>
        </div>
      </div>

      {/* Mic Status Text */}
      <p
        className={`text-xs font-medium mt-2.5 transition-colors text-center ${
          state === 'wake_word_detected'
            ? 'text-amber-400 font-bold'
            : state === 'follow_up_listening'
            ? 'text-cyan-400 font-semibold'
            : state === 'listening'
            ? 'text-rose-400 font-semibold'
            : state === 'thinking'
            ? 'text-amber-400 font-semibold'
            : state === 'speaking'
            ? 'text-violet-400'
            : isDark
            ? 'text-slate-400'
            : 'text-slate-500'
        }`}
      >
        {state === 'wake_word_detected' && "Waking up! I'm listening..."}
        {state === 'follow_up_listening' &&
          `Listening for follow-up (${followUpRemainingSeconds ?? 4}s) • Ask directly or tap mic`}
        {state === 'listening' && 'Listening... Tap mic when finished'}
        {state === 'thinking' && 'Processing your question...'}
        {state === 'speaking' && 'Tia is replying • Tap mic or speak to interrupt'}
        {state === 'idle' &&
          (handsFreeMode
            ? 'Say "Hey Tia" anytime • Or tap mic to speak'
            : 'Tap mic & speak in Hindi, Hinglish, or English')}
      </p>

      {/* Slide-out Text Input Fallback */}
      {showKeyboard && (
        <form
          onSubmit={handleSendText}
          id="text-input-form"
          className={`w-full mt-3 flex items-center space-x-2 p-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-200 ${
            isDark
              ? 'bg-slate-900/90 border-white/10 text-white'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <input
            type="text"
            id="text-input-field"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Type anything (e.g. GDP kya hota hai?)..."
            autoFocus
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            id="btn-submit-text"
            disabled={!typedInput.trim()}
            aria-label="Send message"
            className="w-9 h-9 rounded-full bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
