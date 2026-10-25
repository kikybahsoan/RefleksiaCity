import React, { useState } from 'react';
import { sounds } from '../utils/audio';

interface NotificationManagerProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ onClose, isDarkMode }) => {
  const [permission, setPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [noticeSent, setNoticeSent] = useState(false);

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm === 'granted') {
          new Notification('Kota Refleksia Aktif', {
            body: 'Notifikasi push diaktifkan! Anda akan menerima update materi dan refleksi.',
            icon: '/favicon.ico',
          });
          sounds.playCoinReward();
        }
      } catch {
        // Fallback
      }
    }
  };

  const simulatePush = () => {
    sounds.playEnterBuilding();
    setNoticeSent(true);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Kota Refleksia - Misi Baru!', {
        body: 'Misi baru tersedia di Bandara Vokasi: "Refleksi Kesiapan Magang". Kerjakan untuk +50 Poin!',
      });
    }
    setTimeout(() => setNoticeSent(false), 3500);
  };

  const upcomingUpdates = [
    {
      title: 'Notifikasi Push Pembaruan Refleksi Realtime',
      desc: 'Pemberitahuan otomatis ke smartphone ketika Guru memberi nilai atau membalas pertanyaan di bangunan.',
      status: 'Tersedia Sekarang',
      date: 'Okt 2026',
    },
    {
      title: 'Integrasi Sertifikat Digital PDF & Badge OpenBadges',
      desc: 'Ekspor bukti portofolio refleksi siswa dalam format PDF berstandar sertifikasi vokasi.',
      status: 'Pembaruan Tahap 2',
      date: 'Nov 2026',
    },
    {
      title: 'Simulasi Avatar 3D & Gerak Multiplayer Kolaboratif',
      desc: 'Interaksi gerak real-time antar teman sekelas langsung di pelataran Alun-alun Kota.',
      status: 'Rencana Mendatang',
      date: 'Des 2026',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
          isDarkMode
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-[#FAF8F5] text-slate-800 border-stone-200'
        }`}
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-amber-500/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h2 className="text-base font-bold">Pusat Notifikasi & Pembaruan Fitur</h2>
              <p className="text-xs text-slate-500">Pengaturan push notifications dan roadmap Kota Refleksia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold"
          >
            ✕ Tutup
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Push permission trigger */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold">Izin Notifikasi Web / Push</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Status saat ini:{' '}
                <span className="font-semibold text-amber-600 uppercase font-mono">
                  {permission}
                </span>
              </p>
            </div>
            {permission !== 'granted' ? (
              <button
                onClick={requestPushPermission}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Aktifkan Push
              </button>
            ) : (
              <button
                onClick={simulatePush}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                {noticeSent ? 'Terkirim!' : 'Uji Notifikasi'}
              </button>
            )}
          </div>

          {/* Upcoming Features */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pembaruan Fitur Mendatang
            </h3>
            {upcomingUpdates.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60"
              >
                <div className="flex items-center justify-between text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                <span className="text-[10px] text-slate-400 block mt-1">Rilis: {item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
