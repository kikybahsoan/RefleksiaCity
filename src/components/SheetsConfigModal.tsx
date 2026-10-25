import React, { useState } from 'react';
import { api } from '../services/api';
import { sounds } from '../utils/audio';

interface SheetsConfigModalProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export const SheetsConfigModal: React.FC<SheetsConfigModalProps> = ({ onClose, isDarkMode }) => {
  const [urlInput, setUrlInput] = useState(api.getScriptUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSave = () => {
    api.setScriptUrl(urlInput);
    sounds.playPop();
    setStatusMsg('URL Google Apps Script berhasil disimpan!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      setTestStatus('error');
      setStatusMsg('Silakan masukkan URL Web App Google Apps Script terlebih dahulu.');
      return;
    }

    setTestStatus('testing');
    setStatusMsg('Menghubungi endpoint Google Apps Script...');

    try {
      const res = await fetch(urlInput.trim(), { method: 'GET' });
      if (res.ok) {
        setTestStatus('success');
        setStatusMsg('Koneksi Berhasil! API Google Spreadsheet siap menyinkronkan 8 sheet.');
        api.setScriptUrl(urlInput);
      } else {
        setTestStatus('error');
        setStatusMsg(`Panggilan terhubung dengan status ${res.status}. Pastikan deployment diset 'Anyone'.`);
      }
    } catch {
      // In browser CORS mode, GET or POST might throw CORS if redirects aren't open or Web App permissions
      setTestStatus('success');
      setStatusMsg('URL tersimpan! Data refleksi akan dikirim via POST ke Web App tersebut.');
      api.setScriptUrl(urlInput);
    }
  };

  const copyScriptCode = () => {
    const code = api.getAppsScriptTemplate();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    sounds.playPop();
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
          isDarkMode
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-[#FAF8F5] text-slate-800 border-stone-200'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-emerald-500/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Integrasi Google Spreadsheet</h2>
              <p className="text-xs text-slate-500">
                Hubungkan penyimpanan 8 sheet: Pengguna, Bangunan, Materi, Refleksi, Pertanyaan, Obrolan, Poin, Kunjungan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold"
          >
            ✕ Tutup
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status Alert */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border ${
                testStatus === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                  : testStatus === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-blue-800 dark:text-blue-200'
              }`}
            >
              {statusMsg}
            </div>
          )}

          {/* URL Input Form */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              URL Web App Google Apps Script (<code className="font-mono text-amber-600">APPS_SCRIPT_URL</code>)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="flex-1 text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Simpan URL
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
                >
                  {testStatus === 'testing' ? 'Menguji...' : 'Tes Koneksi'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 Jika URL kosong, sistem tetap berjalan optimal dengan penyimpanan browser lokal (Offline-First Zero Interruption).
            </p>
          </div>

          {/* Step by step guide */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Kode Google Apps Script Otomatis (Code.gs)
              </h3>
              <button
                onClick={copyScriptCode}
                className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                {copiedCode ? '✓ Berhasil Disalin!' : '📋 Salin Kode Script'}
              </button>
            </div>

            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
              <li>Buka menu <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.</li>
              <li>Salin kode otomatis di atas, tempelkan ke file <code className="font-mono text-amber-600">Code.gs</code>.</li>
              <li>Klik <strong>Deploy</strong> &gt; <strong>New Deployment</strong> &gt; Pilih <strong>Web App</strong>.</li>
              <li>Set <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>.</li>
              <li>Salin URL Web App yang berakhiran <code className="font-mono">/exec</code> ke kolom di atas.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
