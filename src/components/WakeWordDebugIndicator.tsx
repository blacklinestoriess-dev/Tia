import React, { useState } from 'react';
import {
  Activity,
  Mic,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
} from 'lucide-react';

export interface WakeWordDebugInfo {
  wakeWordActive: boolean;
  micPermission: 'granted' | 'denied' | 'prompt' | 'unsupported';
  recognizerStatus: string;
  lastRecognizedSpeech: string;
  lastRecognizedTimestamp: string;
  lastWakeDetected: string | null;
  activeLangCode: string;
}

interface WakeWordDebugIndicatorProps {
  debugInfo: WakeWordDebugInfo;
  onTestWakeWord: (phrase: string) => void;
  onRestartListener: () => void;
  onRequestMic: () => void;
  isDark: boolean;
}

export const WakeWordDebugIndicator: React.FC<WakeWordDebugIndicatorProps> = ({
  debugInfo,
  onTestWakeWord,
  onRestartListener,
  onRequestMic,
  isDark,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    if (status.includes('listening') || status.includes('wake_active')) {
      return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    }
    if (status.includes('starting') || status.includes('restarting')) {
      return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    }
    if (status.includes('error') || status.includes('denied')) {
      return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }
    return 'text-slate-400 bg-slate-500/15 border-slate-500/30';
  };

  const getMicBadgeColor = (perm: string) => {
    switch (perm) {
      case 'granted':
        return 'text-emerald-400 bg-emerald-500/20';
      case 'prompt':
        return 'text-amber-400 bg-amber-500/20 animate-pulse';
      case 'denied':
        return 'text-rose-400 bg-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  return (
    <div
      id="wake-word-debug-panel"
      className={`fixed top-16 right-3 z-40 max-w-sm w-full transition-all duration-200 text-xs font-mono shadow-2xl rounded-2xl border backdrop-blur-xl ${
        isDark
          ? 'bg-slate-950/92 border-emerald-500/30 text-slate-200'
          : 'bg-white/95 border-emerald-500/40 text-slate-800'
      }`}
    >
      {/* Top Header / Collapsed Pill Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2 flex items-center justify-between cursor-pointer select-none rounded-t-2xl hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                debugInfo.wakeWordActive ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                debugInfo.wakeWordActive ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            />
          </span>
          <span className="font-bold text-[11px] tracking-tight text-emerald-400 flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 mr-0.5" />
            <span>Wake-Word Debug</span>
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
              debugInfo.wakeWordActive
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {debugInfo.wakeWordActive ? 'Listening' : 'Standby'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${getMicBadgeColor(
              debugInfo.micPermission
            )}`}
          >
            <Mic className="w-3 h-3" />
            <span>{debugInfo.micPermission}</span>
          </span>
          <button
            type="button"
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 cursor-pointer"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Diagnostic Details */}
      {isExpanded && (
        <div className="p-3.5 pt-1 space-y-3 border-t border-white/10 text-[11px]">
          {/* Diagnostic 1: Wake-Word Detection Status */}
          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">Wake-word Active:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(
                debugInfo.wakeWordActive ? 'listening' : 'stopped'
              )}`}
            >
              {debugInfo.wakeWordActive ? 'YES (Always on in open tab)' : 'NO (Disabled or Paused)'}
            </span>
          </div>

          {/* Diagnostic 2: Microphone Permission */}
          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">Mic Permission:</span>
            <div className="flex items-center space-x-2">
              <span className={`font-semibold px-2 py-0.5 rounded ${getMicBadgeColor(debugInfo.micPermission)}`}>
                {debugInfo.micPermission}
              </span>
              {debugInfo.micPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={onRequestMic}
                  className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 cursor-pointer text-[10px]"
                >
                  Grant
                </button>
              )}
            </div>
          </div>

          {/* Diagnostic 3: Speech Recognition Status */}
          <div className="flex items-center justify-between py-1 border-b border-white/5">
            <span className="text-slate-400">Recognition Status:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded border text-[10px] ${getStatusColor(
                debugInfo.recognizerStatus
              )}`}
            >
              {debugInfo.recognizerStatus}
            </span>
          </div>

          {/* Diagnostic 4: Last Recognized Speech */}
          <div className="space-y-1 py-1 border-b border-white/5">
            <div className="flex items-center justify-between text-slate-400">
              <span>Last Recognized Speech:</span>
              <span className="text-[10px] text-slate-400">
                {debugInfo.lastRecognizedTimestamp || 'No speech heard yet'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-cyan-300 min-h-6 break-words">
              {debugInfo.lastRecognizedSpeech ? (
                `"${debugInfo.lastRecognizedSpeech}"`
              ) : (
                <span className="text-slate-400 italic">Say "Hey Tia" to test...</span>
              )}
            </div>
          </div>

          {/* Diagnostic 5: Last Wake Phrase Detected */}
          <div className="space-y-1 py-1 border-b border-white/5">
            <span className="text-slate-400">"Hey Tia" Detected:</span>
            {debugInfo.lastWakeDetected ? (
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-start space-x-1.5">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                <div>
                  <span className="font-bold">Detected!</span> {debugInfo.lastWakeDetected}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic">None detected yet in this session</div>
            )}
          </div>

          {/* Diagnostic 6: Platform & ASR Engine */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span>Engine: Web Speech API ({debugInfo.activeLangCode})</span>
            <button
              type="button"
              onClick={onRestartListener}
              title="Restart speech recognition engine"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Kickstart</span>
            </button>
          </div>

          {/* Test Buttons for Quick Diagnostics */}
          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Simulate Wake Tests:</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                id="btn-test-tia-standalone"
                onClick={() => onTestWakeWord('Tia')}
                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold text-center cursor-pointer active:scale-95"
              >
                "Tia"
              </button>
              <button
                type="button"
                id="btn-test-hey-tia"
                onClick={() => onTestWakeWord('Hey Tia')}
                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold text-center cursor-pointer active:scale-95"
              >
                "Hey Tia"
              </button>
              <button
                type="button"
                id="btn-test-tia-suno"
                onClick={() => onTestWakeWord('Tia suno')}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold text-center cursor-pointer active:scale-95"
              >
                "Tia suno"
              </button>
              <button
                type="button"
                id="btn-test-tia-ek-baat"
                onClick={() => onTestWakeWord('Tia ek baat batao')}
                className="px-2 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-[10px] font-semibold text-center cursor-pointer active:scale-95"
              >
                "Tia ek baat batao"
              </button>
              <button
                type="button"
                id="btn-test-hey-tia-suno"
                onClick={() => onTestWakeWord('Hey Tia, suno')}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold text-center cursor-pointer active:scale-95"
              >
                "Hey Tia, suno"
              </button>
              <button
                type="button"
                id="btn-test-hey-tia-gdp"
                onClick={() => onTestWakeWord('Hey Tia, GDP kya hota hai?')}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-semibold text-center cursor-pointer active:scale-95"
              >
                "Hey Tia, GDP..."
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
