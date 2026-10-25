import React, { useState } from 'react';
import { Role, User } from '../types';
import { api } from '../services/api';
import { hashPin } from '../utils/crypto';
import { sounds } from '../utils/audio';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
  isDarkMode: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, isDarkMode }) => {
  const [selectedRole, setSelectedRole] = useState<Role>('siswa');
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !pin.trim()) {
      setErrorMsg('Mohon masukkan ID dan PIN dengan lengkap.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Securely hash the PIN before checking or transmitting
      const pinHash = await hashPin(pin);
      const user = await api.checkLogin(userId, pinHash);

      if (user) {
        sounds.playEnterBuilding();
        onLoginSuccess(user);
      } else {
        setErrorMsg('ID atau PIN tidak sesuai. Pastikan akun terdaftar di sistem.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat memeriksa akun. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click login helpers for testing & demonstration
  const handleQuickDemo = async (role: Role) => {
    setLoading(true);
    setErrorMsg('');
    const id = role === 'guru' ? 'GURU01' : 'SISWA01';
    setUserId(id);
    setPin('1234');

    const pinHash = await hashPin('1234');
    const user = await api.checkLogin(id, pinHash);
    if (user) {
      sounds.playEnterBuilding();
      onLoginSuccess(user);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border p-6 sm:p-8 space-y-6 ${
          isDarkMode
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-[#FAF8F5] text-slate-800 border-stone-200'
        }`}
      >
        {/* Brand Lockup */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500 text-white font-bold text-xl shadow-md mb-2">
            🏛️
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Kota Refleksia</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kota Virtual Isometrik Pembelajaran Siswa SMK/SMA
          </p>
        </div>

        {/* Role Segmented Selector */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('siswa');
              setUserId('SISWA01');
              setPin('1234');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              selectedRole === 'siswa'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Siswa SMK / SMA
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('guru');
              setUserId('GURU01');
              setPin('1234');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              selectedRole === 'guru'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Guru Pembimbing
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {selectedRole === 'guru' ? 'NIP / ID Guru' : 'NIS / ID Siswa'}
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={selectedRole === 'guru' ? 'Contoh: GURU01' : 'Contoh: SISWA01'}
              required
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                PIN Keamanan (4-6 Digit)
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                🔒 Terenkripsi SHA-256
              </span>
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Masukkan PIN (Demo default: 1234)"
              required
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Memverifikasi Hash...' : 'Masuk ke Kota Refleksia'}</span>
            <span>→</span>
          </button>
        </form>

        {/* Quick Demo Login Buttons */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[11px] text-slate-400 block text-center font-medium">
            Akses Cepat Uji Coba (1-Klik):
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('siswa')}
              className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition-colors text-center"
            >
              Demo Siswa (Andi)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('guru')}
              className="py-2 px-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-[11px] font-semibold transition-colors text-center"
            >
              Demo Guru (Bu Rahma)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
