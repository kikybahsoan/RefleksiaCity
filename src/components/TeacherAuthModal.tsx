import React, { useState } from 'react';
import { sounds } from '../utils/audio';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  isDarkMode,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verification against required passcode: "11001100"
    if (pinInput.trim() === '11001100') {
      sounds.playCoinReward();
      setErrorMessage('');
      onSuccess();
    } else {
      sounds.playPop();
      setErrorMessage('Kata sandi salah! Pastikan memasukkan sandi 11001100.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          isShaking ? 'animate-bounce' : ''
        } ${
          isDarkMode
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-white text-slate-800 border-slate-200'
        }`}
      >
        {/* Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow">
              🔐
            </div>
            <div>
              <h3 className="text-base font-bold">Panel Guru Terkunci</h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Autentikasi Keamanan Guru & Pembimbing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            title="Batal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Panel Pengelolaan Guru berisi modul kurikulum AI, penilaian refleksi, dan setting database spreadsheet.
            Silakan masukkan kata sandi 8 digit guru untuk membuka kunci akses.
          </p>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Kata Sandi Panel Guru:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Masukkan sandi..."
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Sandi hint badge */}
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <span className="font-medium">Kunci Sandi Guru:</span>
            <span className="font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded text-xs select-all">
              11001100
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!pinInput.trim()}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>🔓</span>
              <span>Buka Panel Guru</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
