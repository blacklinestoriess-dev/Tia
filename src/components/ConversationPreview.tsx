import React, { useState } from 'react';
import type { Message, AssistantState } from '../types';
import { Volume2, VolumeX, Copy, Check, Sparkles, User, History, X } from 'lucide-react';
import { getEmotionVisualMeta } from '../services/speechSynthesis';

interface ConversationPreviewProps {
  lastMessage: Message | null;
  lastUserQuery: string | null;
  state: AssistantState;
  onReplay: (msg: Message) => void;
  onStopSpeech: () => void;
  onSelectPrompt: (promptText: string) => void;
  allMessages: Message[];
  isDark: boolean;
}

const SUGGESTED_PROMPTS = [
  'Mera naam kya hai?',
  'Main kahan rehta hoon?',
  'Main kya kar raha hoon?',
  'Mere baare mein kya jaanti ho?',
  'Tia, GDP kya hota hai?',
  'Tia, aaj kya kar rahi ho?',
  'Tia, mujhe ek amazing business idea mila!',
  'Remember that I like black coffee',
];

export const ConversationPreview: React.FC<ConversationPreviewProps> = ({
  lastMessage,
  lastUserQuery,
  state,
  onReplay,
  onStopSpeech,
  onSelectPrompt,
  allMessages,
  isDark,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emotionMeta = lastMessage?.emotion
    ? getEmotionVisualMeta(lastMessage.emotion)
    : null;

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col items-center z-10">
      {/* If no dialogue has occurred yet, show quick suggested chips */}
      {!lastMessage && !lastUserQuery ? (
        <div className="w-full text-center space-y-3">
          <p
            className={`text-xs uppercase tracking-widest font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Try asking Tia
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
            {SUGGESTED_PROMPTS.slice(0, 5).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                id={`prompt-chip-${idx}`}
                onClick={() => onSelectPrompt(prompt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 border active:scale-95 ${
                  isDark
                    ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-white/10 hover:border-rose-500/40'
                    : 'bg-white/80 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-rose-400 shadow-xs'
                }`}
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Minimalist Active Conversation Card */
        <div
          id="conversation-card"
          className={`w-full rounded-2xl p-4 transition-all duration-300 border shadow-lg backdrop-blur-md ${
            isDark
              ? 'bg-slate-900/75 border-white/10 text-slate-200'
              : 'bg-white/90 border-slate-200/80 text-slate-800 shadow-slate-200/50'
          }`}
        >
          {/* User Query snippet */}
          {lastUserQuery && (
            <div className="flex items-start space-x-2 pb-2.5 mb-2.5 border-b border-white/5">
              <div
                className={`p-1 rounded-full ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <User className="w-3.5 h-3.5" />
              </div>
              <p
                className={`text-xs font-medium leading-relaxed italic ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                "{lastUserQuery}"
              </p>
            </div>
          )}

          {/* Tia's Response snippet */}
          {lastMessage && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                      Tia
                    </span>
                  </div>

                  {/* Emotion Pill */}
                  {emotionMeta && (
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${emotionMeta.badgeClass}`}
                    >
                      <span>{emotionMeta.emoji}</span>
                      <span>{emotionMeta.label}</span>
                    </span>
                  )}

                  {/* Detected Language indicator */}
                  {lastMessage.detectedLanguage && (
                    <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                      [{lastMessage.detectedLanguage}]
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {/* Replay or Stop Voice button */}
                  {state === 'speaking' ? (
                    <button
                      type="button"
                      id="btn-stop-speech"
                      onClick={onStopSpeech}
                      className="p-1 rounded-md text-rose-400 hover:bg-rose-500/15 text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Stop speaking"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-replay-speech"
                      onClick={() => onReplay(lastMessage)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Replay Tia's voice with emotion"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Replay</span>
                    </button>
                  )}

                  {/* Copy button */}
                  <button
                    type="button"
                    id="btn-copy-answer"
                    onClick={() => handleCopy(lastMessage.content)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Copy answer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Full conversation history trigger */}
                  {allMessages.length > 2 && (
                    <button
                      type="button"
                      id="btn-open-history"
                      onClick={() => setShowHistoryModal(true)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer ml-1"
                      title="View conversation history"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Spoken Text */}
              <p className="text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line">
                {lastMessage.content}
              </p>

              {/* Spoken Voice Name info */}
              {lastMessage.voiceName && (
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Voice: {lastMessage.voiceName}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md max-h-[80vh] flex flex-col rounded-3xl border p-5 shadow-2xl overflow-hidden ${
              isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-sm font-display">Conversation History</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
              {allMessages.map((msg) => {
                const isUser = msg.role === 'user';
                const itemMeta = msg.emotion ? getEmotionVisualMeta(msg.emotion) : null;

                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-2xl ${
                      isUser
                        ? isDark
                          ? 'bg-slate-800/80 text-slate-200 ml-6'
                          : 'bg-slate-100 text-slate-800 ml-6'
                        : isDark
                        ? 'bg-rose-950/25 border border-rose-500/20 text-slate-200 mr-6'
                        : 'bg-rose-50/70 border border-rose-200 text-slate-800 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold capitalize text-[11px] text-rose-400">
                        {isUser ? 'You' : 'Tia'}
                      </span>
                      <div className="flex items-center space-x-2">
                        {itemMeta && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-medium border ${itemMeta.badgeClass}`}
                          >
                            {itemMeta.emoji} {itemMeta.label}
                          </span>
                        )}
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => onReplay(msg)}
                            className="p-1 hover:text-rose-400 text-slate-400 cursor-pointer"
                            title="Replay this response"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
