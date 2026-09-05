import React from 'react';
import { Stethoscope, LogOut, Phone, Database } from 'lucide-react';
import { DOCTOR_ADMIN } from '../../types';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../../context/ThemeContext';

interface DoctorHeaderProps {
  onLogout: () => void;
  onOpenFirebase: () => void;
}

export const DoctorHeader: React.FC<DoctorHeaderProps> = ({ onLogout, onOpenFirebase }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-30 border-b px-4 py-3 sm:px-6 transition-colors ${
        isDark
          ? 'bg-zinc-950/90 border-zinc-800 text-white backdrop-blur-md'
          : 'bg-white/90 border-slate-200 text-slate-900 backdrop-blur-md'
      }`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Doctor Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight">
                {DOCTOR_ADMIN.name}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[10px] font-bold uppercase">
                DOCTOR ADMIN
              </span>
            </div>
            <div
              className={`flex items-center gap-2 text-xs ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-sky-500" />
                <span>{DOCTOR_ADMIN.phone}</span>
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                OPD Active
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Firebase RTDB & FCM Button */}
          

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-rose-300 hover:bg-rose-950/40 hover:border-rose-800'
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
