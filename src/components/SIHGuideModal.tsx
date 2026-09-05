import React from 'react';
import { Laptop, Award, Sparkles, CheckCircle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SIHGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SIHGuideModal: React.FC<SIHGuideModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`rounded-2xl max-w-2xl w-full p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">SIH Hackathon & Free Tooling Stack Guide</h3>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Dr. Doctor Clinic Control Panel & Zero-Cost Infrastructure
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free alternatives answer to user query */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <Laptop className="w-4 h-4" />
            <span>Free Platforms & Tools to Build This App (Zero Cost)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-xl border space-y-1 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <strong className="text-xs block font-bold">1. VS Code + GitHub Codespaces</strong>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                GitHub provides 60 free core-hours/month of Codespaces. You can clone your repo, run Vite + React, and test for free in your browser.
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border space-y-1 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <strong className="text-xs block font-bold">2. Firebase Spark Plan (100% Free)</strong>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Firebase Realtime Database gives 1 GB stored data, 10 GB/month transfer, and 100 simultaneous connections completely free with no credit card required.
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border space-y-1 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <strong className="text-xs block font-bold">3. Vercel / Netlify / Cloudflare Pages</strong>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Deploy your frontend repository directly from GitHub with automated CI/CD for free forever with global fast CDN and HTTPS.
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border space-y-1 ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <strong className="text-xs block font-bold">4. Cursor / Windsurf / Gemini CLI</strong>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Free tiers with AI code suggestions to write React, TypeScript, and Firebase hooks locally on your computer.
              </p>
            </div>
          </div>
        </div>

        {/* SIH Presentation & Pitch Highlights */}
        <div
          className={`space-y-3 pt-3 border-t ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}
        >
          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>How Dr. Doctor Wins at Smart India Hackathon (SIH)</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div
              className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <strong>1. Strict FCFS Queueing (Jo Pehle Aayega, Top Par):</strong>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Eliminates OPD chaos and VIP bypassing with tamper-proof chronological token issuance, live waiting estimation, and cabin calling buzzer.
                </p>
              </div>
            </div>

            <div
              className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <strong>2. Realtime Prescription in Client's Phone PDF:</strong>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  The doctor clicks "Save & Send" and the patient instantly sees the formatted prescription with one-click PDF download on their phone, complete with clinic header and doctor seal.
                </p>
              </div>
            </div>

            <div
              className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <strong>3. Scheduled Medicine Reminder Alarms:</strong>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Times set by the doctor (e.g. 08:00 AM, 02:00 PM, 08:30 PM) automatically trigger audio reminder chimes and browser push notifications on the patient's device, solving medication non-adherence.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`pt-3 border-t flex justify-end ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs"
          >
            Got It, Thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
