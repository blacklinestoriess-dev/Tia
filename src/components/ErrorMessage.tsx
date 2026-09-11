import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
  onRetry,
}) => {
  if (!message) return null;

  return (
    <div
      id="error-banner"
      role="alert"
      className="fixed top-16 left-4 right-4 max-w-md mx-auto z-50 p-3 rounded-2xl bg-red-950/90 border border-red-500/40 text-red-200 text-xs shadow-2xl backdrop-blur-md flex items-start space-x-2.5 animate-fade-in"
    >
      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="leading-snug">{message}</p>
        {onRetry && (
          <button
            type="button"
            id="btn-retry-action"
            onClick={onRetry}
            className="mt-1.5 inline-flex items-center space-x-1 font-semibold text-rose-300 hover:text-white underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Try Again</span>
          </button>
        )}
      </div>
      <button
        type="button"
        id="btn-dismiss-error"
        onClick={onDismiss}
        className="p-1 text-red-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
