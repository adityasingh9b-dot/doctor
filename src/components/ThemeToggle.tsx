import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
        theme === 'dark'
          ? 'bg-zinc-900 border-zinc-700 text-amber-300 hover:bg-zinc-800'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
      } ${className}`}
      title={`Switch to ${theme === 'dark' ? 'White Light' : 'Dark Black'} Theme`}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700" />
      )}
      {showLabel && (
        <span className="hidden sm:inline">
          {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
        </span>
      )}
    </button>
  );
};
