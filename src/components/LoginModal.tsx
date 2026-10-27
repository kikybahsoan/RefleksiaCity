import React, { useState, useEffect, useMemo } from 'react';
import { Role, User } from '../types';
import { api } from '../services/api';
import { hashPin } from '../utils/crypto';
import { sounds } from '../utils/audio';
import { AvatarView } from './AvatarView';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
  isDarkMode: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, isDarkMode }) => {
  const [selectedRole, setSelectedRole] = useState<Role>('siswa');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Directory Modal (Direktori Akun & Sandi Siswa/Guru)
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load registered users on mount
  useEffect(() => {
    api.getUsers().then(users => {
      setAllUsers(users);
      // Default to first student or default student
      const defaultSiswa = users.find(u => u.role === 'siswa' && u.id.includes('118460234')) || users.find(u => u.role === 'siswa');
      if (defaultSiswa) {
        setSelectedUser(defaultSiswa);
        setIdentifierInput(defaultSiswa.nisn || defaultSiswa.id);
        setPasswordInput(defaultSiswa.plainPassword || '1234');
      }
    });
  }, []);

  // Filtered users for role & class
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (u.role !== selectedRole) return false;
      if (selectedRole === 'siswa' && selectedClass !== 'all' && u.className !== selectedClass) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        (u.nisn && u.nisn.toLowerCase().includes(q)) ||
        (u.nip && u.nip.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [allUsers, selectedRole, selectedClass, searchQuery]);

  const classesList = [
    { id: 'all', label: 'Semua Kelas (232)' },
    { id: '10-DKV-1', label: '10 DKV 1' },
    { id: '10-DKV-2', label: '10 DKV 2' },
    { id: '10-DKV-3', label: '10 DKV 3' },
    { id: '11-DKV-1', label: '11 DKV 1' },
    { id: '11-DKV-2', label: '11 DKV 2' },
    { id: '11-DKV-3', label: '11 DKV 3' },
    { id: '12-DKV-1', label: '12 DKV 1' },
    { id: '12-DKV-2', label: '12 DKV 2' },
  ];

  const handleSelectUser = (u: User) => {
    setSelectedUser(u);
    setIdentifierInput(u.nisn || u.nip || u.id);
    setPasswordInput(u.plainPassword || '1234');
    setErrorMsg('');
    sounds.playPop();
  };

  const handleRoleSwitch = (role: Role) => {
    setSelectedRole(role);
    setSearchQuery('');
    setErrorMsg('');
    const firstOfRole = allUsers.find(u => u.role === role);
    if (firstOfRole) {
      handleSelectUser(firstOfRole);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim() || !passwordInput.trim()) {
      setErrorMsg('Mohon masukkan NISN/NIP dan Password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const pinHash = await hashPin(passwordInput);
      const user = await api.checkLogin(identifierInput, pinHash, passwordInput);

      if (user) {
        sounds.playEnterBuilding();
        onLoginSuccess(user);
      } else {
        setErrorMsg('NISN/NIP atau Password salah. Periksa akun atau gunakan pemilih akun di bawah.');
      }
    } catch {
      setErrorMsg('Terjadi kendala saat memeriksa akun. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = (u: User) => {
    const credText = `Nama: ${u.name}\n${u.role === 'guru' ? 'NIP' : 'NISN'}: ${u.nip || u.nisn || u.id}\nPassword: ${u.plainPassword || '1234'}`;
    navigator.clipboard.writeText(credText);
    setCopiedId(u.id);
    sounds.playPop();
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border my-auto transition-all ${
          isDarkMode
            ? 'bg-slate-900/95 text-slate-100 border-slate-800'
            : 'bg-[#FAF8F5] text-slate-800 border-stone-200'
        }`}
      >
        {/* Top Header School Branding */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 uppercase tracking-wider">
                  SMK Negeri 2 Gorontalo
                </span>
                <span className="text-[10px] font-medium text-amber-100 hidden sm:inline">
                  T.A 2026/2027
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Kota Refleksia · DKV Virtual Hub
              </h1>
            </div>
          </div>

          {/* Direktori Akun Button */}
          <button
            type="button"
            onClick={() => setShowDirectoryModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <span>📖</span>
            <span>Direktori Akun ({allUsers.length})</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Role Segmented Selector */}
          <div className="flex p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleRoleSwitch('siswa')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'siswa'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>👨‍🎓</span>
              <span>Siswa DKV (232 Siswa)</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('guru')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'guru'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>👨‍🏫</span>
              <span>Guru Pembimbing (8 Guru)</span>
            </button>
          </div>

          {/* Quick Filter Section for Students */}
          {selectedRole === 'siswa' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Pilih Rombel / Kelas DKV:</span>
                <span>{filteredUsers.length} Siswa Terdaftar</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {classesList.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClass(c.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all text-[11px] ${
                      selectedClass === c.id
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interactive User Carousel / Selection Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {selectedRole === 'guru' ? 'Pilih Profil Guru:' : 'Pilih Nama Siswa:'}
              </label>
              {/* Search Bar */}
              <div className="relative w-48 sm:w-56">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / NISN..."
                  className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable User Selector Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
              {filteredUsers.slice(0, 40).map(u => {
                const isCurrent = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`p-2 rounded-xl text-left flex items-center justify-between gap-2 border transition-all ${
                      isCurrent
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 shadow-sm'
                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-amber-400 shrink-0 border border-white/40">
                        <AvatarView avatar={u.avatar} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {u.className || u.id} · {u.role === 'guru' ? `NIP: ${u.nip}` : `NISN: ${u.nisn}`}
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-amber-600 font-bold shrink-0">✓ Terpilih</span>
                    )}
                  </button>
                );
              })}
              {filteredUsers.length === 0 && (
                <div className="col-span-2 py-4 text-center text-xs text-slate-400">
                  Tidak ditemukan siswa/guru dengan kata kunci tersebut.
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Login Direct Input */}
          <form onSubmit={handleLogin} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {selectedRole === 'guru' ? 'NIP / ID Guru' : 'NISN / ID Siswa'}
                </label>
                <input
                  type="text"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder={selectedRole === 'guru' ? 'Contoh: 19901130... atau G-03' : 'Contoh: 118460234'}
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password Akun:
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    🔒 Random Generated
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password..."
                    required
                    className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    title={showPassword ? 'Sembunyikan' : 'Lihat'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            {/* Selected User Quick Preview Banner */}
            {selectedUser && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">🔑</span>
                  <div className="truncate">
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      {selectedUser.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {' '}· Password: <code className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">{selectedUser.plainPassword || '1234'}</code>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(selectedUser)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] shrink-0 transition-all active:scale-95"
                >
                  {copiedId === selectedUser.id ? '✓ Disalin' : '📋 Salin Akun'}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Memverifikasi Akun...' : 'Masuk ke Kota Refleksia 🚀'}</span>
              <span>→</span>
            </button>
          </form>
        </div>
      </div>

      {/* MODAL DIREKTORI AKUN & SANDI SISWA/GURU */}
      {showDirectoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border ${
              isDarkMode ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-800 border-slate-200'
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>📖</span>
                  <span>Direktori Akun & Password (SMK Negeri 2 Gorontalo)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar 8 Guru & 232 Siswa DKV beserta Password Acak yang Digenerate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Search in Directory */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama, NISN, NIP, atau kelas..."
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('siswa')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    selectedRole === 'siswa' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  Siswa ({allUsers.filter(u => u.role === 'siswa').length})
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('guru')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    selectedRole === 'guru' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}
                >
                  Guru ({allUsers.filter(u => u.role === 'guru').length})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredUsers.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-lg">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-amber-400 shrink-0">
                      <AvatarView avatar={u.avatar} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate text-slate-900 dark:text-slate-100">{u.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{u.className || u.id}</span>
                        <span>·</span>
                        <span>{u.role === 'guru' ? `NIP: ${u.nip}` : `NISN: ${u.nisn}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Password:</div>
                      <code className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        {u.plainPassword || '1234'}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectUser(u);
                        setShowDirectoryModal(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                    >
                      Pilih Akun
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
