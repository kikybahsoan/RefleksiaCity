import React, { useState, useEffect } from 'react';
import { User, Building } from '../types';
import { AvatarView } from './AvatarView';
import { sounds } from '../utils/audio';

interface HUDProps {
  currentUser: User;
  buildings: Building[];
  selectedBuilding?: Building | null;
  onEnterBuilding?: (building: Building) => void;
  onCloseBuildingInfo?: () => void;
  onOpenTeacherPanel?: () => void;
  onOpenSheetsConfig: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  currentUser,
  selectedBuilding,
  onEnterBuilding,
  onCloseBuildingInfo,
  onOpenTeacherPanel,
  onOpenSheetsConfig,
  onOpenNotifications,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.ambientEnabled);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Live real-time clock synchronized with user local time (WIB / local time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${hours}:${minutes}:${seconds} WIB`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const isNowOn = sounds.toggleAmbient();
    setSoundEnabled(isNowOn);
    if (isNowOn) sounds.playPop();
  };

  const username = `@${currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 14)}`;
  const displayClass = currentUser.className || (currentUser.role === 'guru' ? 'Guru Pembimbing' : 'XII RPL 1');

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 pointer-events-none select-none">
      <div className="w-full flex items-start justify-between gap-4">
        {/* 
          LEFT ZONE:
          1. [ ‹ ] [ (avatar) @username  🪙 points saldo ]
          2. INFO GEDUNG DI HEADER (DIBAWAH ICON, NAMA, SALDO)
        */}
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          {/* Top capsule: User identity & saldo */}
          <div className="flex items-center gap-2">
            {/* Back / Switch account button */}
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-full bg-[#18202F]/90 hover:bg-[#253247] text-white flex items-center justify-center border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
              title="Ganti Akun / Keluar"
            >
              <span className="text-sm font-bold">‹</span>
            </button>

            {/* User profile capsule with avatar, username, and coin points balance */}
            <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#18202F]/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-white">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-400 flex items-center justify-center shrink-0 border border-white/30">
                <AvatarView avatar={currentUser.avatar} size="sm" />
              </div>

              <div className="flex flex-col pr-1">
                <span className="text-xs font-bold leading-tight tracking-tight">
                  {username}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-amber-300 font-mono">
                  <span>🪙</span>
                  <span className="font-bold tabular-nums">
                    {currentUser.points.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">saldo</span>
                </div>
              </div>
            </div>
          </div>

          {/* 
            INFO SETIAP GEDUNG DI HEADER (Ditempatkan persis dibawah icon, nama, saldo sesuai instruksi)
          */}
          {selectedBuilding && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-[#18202F]/95 backdrop-blur-md border border-slate-700/80 shadow-2xl animate-fadeIn text-white max-w-sm">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm shrink-0"
                  style={{ backgroundColor: selectedBuilding.accentColor }}
                >
                  🏛️
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold leading-tight whitespace-nowrap">
                      {selectedBuilding.name}
                    </span>
                    {selectedBuilding.roleBadgeText && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium whitespace-nowrap border border-amber-500/30">
                        {selectedBuilding.roleBadgeText}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">
                    {selectedBuilding.tagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                <button
                  onClick={() => onEnterBuilding?.(selectedBuilding)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition-all active:scale-95 flex items-center gap-1"
                >
                  <span>Masuk</span>
                  <span>→</span>
                </button>
                <button
                  onClick={onCloseBuildingInfo}
                  className="p-1 rounded-lg text-slate-400 hover:text-white text-xs"
                  title="Tutup info gedung"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 
          RIGHT ZONE:
          [ 🕒 Waktu Realtime ] [ 🎓 Kelas Siswa ] [ 🔊 Suara Damai ] + [ 📋 Panel Guru ] [ 📊 Sheets ]
        */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Waktu yang tersinkronkan dengan waktu saat ini */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18202F]/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs font-medium text-amber-300 font-mono"
            title="Waktu Real-time Tersinkron"
          >
            <span>🕒</span>
            <span className="tabular-nums font-semibold">{currentTimeStr || '16:51 WIB'}</span>
          </div>

          {/* Kelas Siswa / Guru */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18202F]/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs font-semibold text-emerald-400"
            title="Kelas Siswa / Pembina"
          >
            <span>🎓</span>
            <span>{displayClass}</span>
          </div>

          {/* Teacher Dashboard Trigger (for Guru role) */}
          {currentUser.role === 'guru' && onOpenTeacherPanel && (
            <button
              onClick={onOpenTeacherPanel}
              className="px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Panel Guru</span>
            </button>
          )}

          {/* Google Sheets API Config */}
          <button
            onClick={onOpenSheetsConfig}
            className="w-9 h-9 rounded-full bg-[#18202F]/90 hover:bg-[#253247] text-white flex items-center justify-center border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Pengaturan Google Spreadsheet (Tersinkron Otomatis)"
          >
            <span className="text-xs">📊</span>
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-full bg-[#18202F]/90 hover:bg-[#253247] text-white flex items-center justify-center border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Pusat Notifikasi"
          >
            <span className="text-xs">🔔</span>
          </button>

          {/* Peaceful Ambient Soundscape Toggle */}
          <button
            onClick={toggleSound}
            className={`w-9 h-9 rounded-full ${
              soundEnabled ? 'bg-emerald-600/90 text-white shadow-emerald-500/20' : 'bg-[#18202F]/90 text-slate-400'
            } hover:bg-[#253247] flex items-center justify-center border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95`}
            title={soundEnabled ? 'Matikan Suara Damai Lofi & Kicauan Burung' : 'Putar Suara Damai & Kicauan Burung'}
          >
            <span className="text-xs">{soundEnabled ? '🔊' : '🔇'}</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="w-9 h-9 rounded-full bg-[#18202F]/90 hover:bg-[#253247] text-white flex items-center justify-center border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title={isDarkMode ? 'Beralih ke Mode Siang (Awan & Matahari)' : 'Beralih ke Mode Malam (Kunang-Kunang & Bintang)'}
          >
            <span className="text-xs">{isDarkMode ? '☀️' : '🌙'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
