import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Settings, Sparkles, UserCheck } from 'lucide-react';
import type { TiaSettings, OwnerProfile } from '../types';

interface HeaderProps {
  settings: TiaSettings;
  onUpdateSettings: (updater: Partial<TiaSettings>) => void;
  onOpenSettings: () => void;
  isDark: boolean;
  ownerProfile?: OwnerProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
  isDark,
  ownerProfile,
}) => {
  return (
    <header
      id="app-header"
      className="w-full max-w-xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between z-20"
    >
      {/* Left: Brand info */}
      <div className="flex items-center space-x-2.5">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-violet-600 shadow-md shadow-rose-500/20">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0b0f19] rounded-full" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1
              id="brand-name"
              className={`font-bold tracking-tight text-lg leading-tight font-display ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Tia
            </h1>
            <button
              type="button"
              id="btn-toggle-hands-free"
              onClick={() =>
                onUpdateSettings({ handsFreeMode: !settings.handsFreeMode })
              }
              title={
                settings.handsFreeMode
                  ? 'Hands-Free "Hey Tia" active. Click to disable.'
                  : 'Hands-Free inactive. Click to enable "Hey Tia".'
              }
              className={`text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full border flex items-center space-x-1 cursor-pointer transition-all ${
                settings.handsFreeMode
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/25'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  settings.handsFreeMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>{settings.handsFreeMode ? 'Hey Tia' : 'Manual Mic'}</span>
            </button>

            {/* Owner Profile Badge */}
            <button
              type="button"
              id="btn-header-owner-badge"
              onClick={onOpenSettings}
              title={`Owner: ${ownerProfile?.name || 'Anurag'} (${ownerProfile?.location || 'Patna, India'}) - Click to view Profile & Memory`}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center space-x-1 cursor-pointer transition-all ${
                isDark
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <UserCheck className="w-3 h-3 text-rose-400" />
              <span>{ownerProfile?.name || 'Anurag'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-none">
            {settings.funnyMode ? 'Witty & Smart' : 'Helpful & Direct'} •{' '}
            {settings.languagePreference.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Right: Quick action controls */}
      <div className="flex items-center space-x-1.5">
        {/* Voice Toggle */}
        <button
          type="button"
          id="btn-voice-toggle"
          onClick={() => onUpdateSettings({ voiceEnabled: !settings.voiceEnabled })}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            settings.voiceEnabled
              ? isDark
                ? 'text-rose-400 hover:bg-white/10'
                : 'text-rose-600 hover:bg-slate-200'
              : 'text-slate-500 hover:bg-white/5'
          }`}
          title={settings.voiceEnabled ? 'Voice output enabled' : 'Voice output muted'}
          aria-label={settings.voiceEnabled ? 'Mute voice' : 'Unmute voice'}
        >
          {settings.voiceEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          id="btn-theme-toggle"
          onClick={() =>
            onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
          }
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Settings button */}
        <button
          type="button"
          id="btn-settings"
          onClick={onOpenSettings}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200'
          }`}
          title="Tia Settings"
          aria-label="Open settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
