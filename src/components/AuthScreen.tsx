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

    // 3. Neither matched
    setErrorMsg(
      'Invalid Phone Number or Password. For Doctor Admin, enter Phone: 9369250645 and Password: 1234.'
    );
  };

  const handleFillAdmin = () => {
    setPhone(DOCTOR_ADMIN.phone);
    setPassword(DOCTOR_ADMIN.passkey);
    setErrorMsg('');
  };

  const handleFillClient = () => {
    const demo = clients[0] || { phone: '9811122334', passkey: '2222' };
    setPhone(demo.phone);
    setPassword(demo.passkey);
    setErrorMsg('');
  };

  const isDark = theme === 'dark';

  return (
    
    <div
  className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors bg-cover bg-center bg-no-repeat ${
    isDark ? 'text-zinc-100' : 'text-slate-900'
  }`}
  
  style={{
    backgroundImage: `url('../../assets/doc.png')`,
  }}

>
    
      
{/* Top Header Bar with Brand and Theme Toggle */}
<header className={`max-w-md w-full mx-auto flex items-center justify-between py-3 px-4 rounded-2xl border shadow-sm transition-colors ${
  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
}`}>
  <div className="flex items-center gap-2">
    <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
      <Stethoscope className="w-5 h-5" />
    </div>
    <span className={`font-bold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
      Dr. Doctor Clinic
    </span>
  </div>

  <div className="flex items-center gap-2">
    <ThemeToggle />
  </div>
</header>

      {/* Center Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div
          className={`rounded-2xl p-6 sm:p-8 border shadow-sm space-y-6 transition-colors ${
            isDark
              ? 'bg-zinc-900 border-zinc-800'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Card Header */}
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-bold tracking-tight">
              Welcome to Dr. Doctor
            </h1>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Enter your credentials given by your doctor
            </p>
          </div>

          {errorMsg && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                isDark
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {errorMsg}
            </div>
          )}

          {/* Unified Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  className={`w-4 h-4 absolute left-3.5 top-3 ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDark
                      ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-semibold mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}
              >
                Password / Passkey
              </label>
              <div className="relative">
                <Lock
                  className={`w-4 h-4 absolute left-3.5 top-3 ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isDark
                      ? 'bg-black/50 border-zinc-700 text-white placeholder:text-zinc-600'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Clean Quick Demo Access */}
          
        </div>

        {/* Firebase Realtime Database & FCM Notice */}
        <div className="mt-4 text-center space-y-1">
          
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center py-2">
        <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
          Dr. Doctor Clinic • Your personalized All-in-One App
        </p>
      </footer>
    </div>
  );
};
