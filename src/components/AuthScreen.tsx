import React, { useState } from 'react';
import { Stethoscope, Lock, Phone, ArrowRight, ShieldCheck, Database, Bell } from 'lucide-react';
import { DOCTOR_ADMIN, ClientUser, FirebaseSyncConfig } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

interface AuthScreenProps {
  clients: ClientUser[];
  onLoginDoctor: () => void;
  onLoginClient: (client: ClientUser) => void;
  onOpenFirebase: () => void;
  firebaseConfig: FirebaseSyncConfig;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  clients,
  onLoginDoctor,
  onLoginClient,
  onOpenFirebase,
  firebaseConfig,
}) => {
  const { theme } = useTheme();

  // Form Fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanInputPhone = phone.replace(/\D/g, '');
    const cleanAdminPhone = DOCTOR_ADMIN.phone.replace(/\D/g, '');
    const cleanPassword = password.trim();

    // 1. Check if matches ADMIN
    if (cleanInputPhone === cleanAdminPhone && cleanPassword === DOCTOR_ADMIN.passkey) {
      onLoginDoctor();
      return;
    }

    // 2. Check if matches registered Client
    const foundClient = clients.find(
      (c) => c.phone.replace(/\D/g, '') === cleanInputPhone && c.passkey.trim() === cleanPassword
    );

    if (foundClient) {
      onLoginClient(foundClient);
      return;
    }

    // 3. Neither matched - Secured professional error message
    setErrorMsg('Please enter correct details as sent by your Doctor.');
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-between p-4 sm:p-6 overflow-hidden transition-colors ${
        isDark ? 'bg-black text-zinc-100' : 'bg-gradient-to-b from-green-50 via-white to-white text-slate-900'
      }`}
    >
      {/* Decorative accent glow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full blur-3xl ${
          isDark ? 'bg-green-500/10' : 'bg-green-400/20'
        }`}
      />

      {/* Top Header Bar */}
      <header
        className={`relative max-w-md w-full mx-auto flex items-center justify-between py-3.5 px-5 rounded-2xl border shadow-sm transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-md">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <span className={`font-black text-base tracking-tight block ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Dr. Doctor Clinic
            </span>
            <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
              OPD Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Center Main Login Card */}
      <main className="relative max-w-md w-full mx-auto my-auto py-6 space-y-6">
        {/* Feature strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ShieldCheck, label: 'Live Token Queue' },
            { icon: Database, label: 'Digital Prescriptions' },
            { icon: Bell, label: 'Dose Reminders' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className={`rounded-2xl border p-3.5 flex flex-col items-center gap-2 text-center transition-all shadow-sm ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-bold leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div
          className={`rounded-3xl p-6 sm:p-8 border shadow-xl space-y-6 transition-colors ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Card Header */}
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-black tracking-tight">
              Welcome Back
            </h1>
            <p className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Enter your credentials sent by your doctor to sign in
            </p>
          </div>

          {errorMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-3 shadow-sm ${
                isDark
                  ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Unified Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  className={`w-4 h-4 absolute left-4 top-3.5 ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm ${
                    isDark
                      ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}
              >
                Password / Passkey
              </label>
              <div className="relative">
                <Lock
                  className={`w-4 h-4 absolute left-4 top-3.5 ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm ${
                    isDark
                      ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            {/* Big Medanta Style Button */}
            <button
              type="submit"
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 mt-4"
            >
              <span>Sign In Securely</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`relative max-w-md w-full mx-auto text-center py-3.5 px-4 rounded-2xl border shadow-sm transition-colors ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white/90 backdrop-blur-sm border-slate-200 text-slate-500'
        }`}
      >
        <p className="text-xs font-bold">
          Dr. Doctor Clinic • Secure Patient Portal
        </p>
      </footer>
    </div>
  );
};
