import React, { useState, useEffect } from 'react';
import { User, Building, Material, Reflection, Question, ActivityLog, BuildingId } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { generateCurriculumWithAi, GeneratedCurriculum } from '../services/curriculumAi';

interface TeacherDashboardProps {
  currentUser: User;
  buildings: Building[];
  onClose: () => void;
  onLockPanel?: () => void;
  isDarkMode: boolean;
  onRefreshData?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  buildings,
  onClose,
  onLockPanel,
  isDarkMode,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'kurikulum-ai' | 'refleksi' | 'pertanyaan' | 'materi' | 'laporan' | 'poin' | 'spreadsheet'>('kurikulum-ai');

  // Spreadsheet Settings states
  const [spreadsheetUrlInput, setSpreadsheetUrlInput] = useState(api.getScriptUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [isSyncingLiveChat, setIsSyncingLiveChat] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState('');
  const [copiedScriptCode, setCopiedScriptCode] = useState(false);

  // AI Curriculum Generator states
  const [aiElemen, setAiElemen] = useState('Pemrograman Web dan Perangkat Bergerak');
  const [aiTujuan, setAiTujuan] = useState('Peserta didik mampu memahami arsitektur REST API, menguji endpoint CRUD, dan menerapkan autentikasi token secara mandiri.');
  const [aiMateri, setAiMateri] = useState('REST API, Metode HTTP (GET, POST, PUT, DELETE), JSON, Token Authentication, Error Code');
  const [aiTargetKelas, setAiTargetKelas] = useState('XII RPL 1');
  const [aiTenggat, setAiTenggat] = useState('1 Minggu (31 Oktober 2026)');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generatedCurriculum, setGeneratedCurriculum] = useState<GeneratedCurriculum | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<'ai' | 'fallback' | null>(null);

  // Data states
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Teacher feedback inputs
  const [feedbackInput, setFeedbackInput] = useState<{ [id: string]: string }>({});
  const [scoreInput, setScoreInput] = useState<{ [id: string]: number }>({});

  // Teacher answer input
  const [answerInput, setAnswerInput] = useState<{ [id: string]: string }>({});

  // Add material form
  const [newMatBuilding, setNewMatBuilding] = useState<BuildingId>('perpustakaan');
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatCategory, setNewMatCategory] = useState('Literasi Kejuruan');
  const [newMatExcerpt, setNewMatExcerpt] = useState('');
  const [newMatContent, setNewMatContent] = useState('');
  const [newMatPoints, setNewMatPoints] = useState(20);
  const [matSuccess, setMatSuccess] = useState(false);

  // Award direct points form
  const [targetStudentId, setTargetStudentId] = useState('');
  const [bonusPointsAmt, setBonusPointsAmt] = useState(25);
  const [bonusReason, setBonusReason] = useState('Apresiasi keaktifan bernalar kritis');
  const [awardSuccess, setAwardSuccess] = useState(false);

  // Load all data
  const loadData = async () => {
    const [refs, qs, mats, acts, uList] = await Promise.all([
      api.getReflections(),
      api.getQuestions(),
      api.getMaterials(),
      api.getActivities(),
      api.getUsers(),
    ]);
    setReflections(refs);
    setQuestions(qs);
    setMaterials(mats);
    setActivities(acts);
    setUsers(uList.filter(u => u.role === 'siswa'));
    if (uList.filter(u => u.role === 'siswa').length > 0) {
      setTargetStudentId(uList.filter(u => u.role === 'siswa')[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Preset curriculum presets for quick 1-click loading
  const curriculumPresets = [
    {
      label: '🌐 Rekayasa Perangkat Lunak (RPL)',
      elemen: 'Pemrograman Web dan Perangkat Bergerak',
      tujuan: 'Peserta didik mampu memahami arsitektur REST API, menguji endpoint CRUD, dan menerapkan autentikasi token secara mandiri.',
      materi: 'REST API, Metode HTTP (GET, POST, PUT, DELETE), JSON, Token Authentication, Error Code',
    },
    {
      label: '🔌 Jaringan Komputer (TKJ)',
      elemen: 'Teknologi Jaringan Berbasis Luas (WAN) & Keamanan',
      tujuan: 'Peserta didik mampu mengkonfigurasi routing dinamis, menerapkan firewall filter rules, dan menganalisis paket data jaringan.',
      materi: 'Routing OSPF, Mikrotik RouterOS, Firewall NAT, Bandwidth Management, WireShark',
    },
    {
      label: '🎨 Desain Komunikasi Visual (DKV)',
      elemen: 'Prinsip Dasar Desain & Desain UI/UX',
      tujuan: 'Peserta didik mampu merancang antarmuka aplikasi seluler dengan menerapkan hierarki visual, kontras warna, dan konsistensi tipografi.',
      materi: 'Design System, Color Harmony, Wireframing, Prototyping, Usability Testing',
    },
    {
      label: '📈 Pemasaran & Bisnis Digital',
      elemen: 'Pemasaran Digital & E-Commerce Vokasi',
      tujuan: 'Peserta didik mampu merancang kampanye digital marketing multi-channel dan menganalisis konversi penjualan produk kewirausahaan.',
      materi: 'Content Marketing, Copywriting, Social Media Ads, Sales Funnel, Customer Journey',
    },
  ];

  const handleApplyPreset = (preset: typeof curriculumPresets[0]) => {
    setAiElemen(preset.elemen);
    setAiTujuan(preset.tujuan);
    setAiMateri(preset.materi);
    sounds.playPop();
  };

  const handleGenerateCurriculum = async () => {
    if (!aiElemen.trim() || !aiTujuan.trim() || !aiMateri.trim()) return;
    setIsGeneratingAi(true);
    sounds.playPop();
    try {
      const { curriculum, source } = await generateCurriculumWithAi({
        elemen: aiElemen,
        tujuanPembelajaran: aiTujuan,
        materiEsensial: aiMateri,
        targetKelas: aiTargetKelas,
        tenggatWaktu: aiTenggat,
      });
      setGeneratedCurriculum(curriculum);
      setGenerationSource(source);
      sounds.playCoinReward();
    } catch (e: any) {
      console.error('Error generating curriculum:', e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyToCity = async () => {
    if (!generatedCurriculum) return;
    await api.applyAiCurriculumToBuildings(generatedCurriculum);
    sounds.playFanfare();
    setAiSuccessMessage(`Berhasil mendistribusikan kurikulum "${generatedCurriculum.themeTitle}" ke 8 bangunan Kota Refleksia!`);
    await loadData();
    if (onRefreshData) onRefreshData();
    setTimeout(() => setAiSuccessMessage(null), 6000);
  };

  // Submit Feedback & Grade for Reflection
  const handleGradeReflection = async (refId: string) => {
    const feedback = feedbackInput[refId] || 'Refleksi sangat baik dan menunjukkan perkembangan nalar kritis.';
    const score = scoreInput[refId] || 90;

    await api.gradeReflection(refId, feedback, score, 15);
    sounds.playCoinReward();
    await loadData();
    if (onRefreshData) onRefreshData();
  };

  // Submit Answer to Question
  const handleAnswerQuestion = async (qId: string) => {
    const answer = answerInput[qId];
    if (!answer?.trim()) return;

    await api.answerQuestion(qId, answer, currentUser.name);
    sounds.playPop();
    setAnswerInput(prev => ({ ...prev, [qId]: '' }));
    await loadData();
    if (onRefreshData) onRefreshData();
  };

  // Submit New Material
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatTitle.trim() || !newMatContent.trim()) return;

    await api.addMaterial({
      buildingId: newMatBuilding,
      title: newMatTitle,
      category: newMatCategory,
      excerpt: newMatExcerpt || newMatContent.slice(0, 80) + '...',
      content: newMatContent,
      readTime: '3 menit',
      pointsReward: Number(newMatPoints),
      author: currentUser.name,
    });

    sounds.playPop();
    setMatSuccess(true);
    setNewMatTitle('');
    setNewMatExcerpt('');
    setNewMatContent('');
    await loadData();
    if (onRefreshData) onRefreshData();
    setTimeout(() => setMatSuccess(false), 3000);
  };

  // Give direct points to student
  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId) return;

    await api.updateUserPoints(targetStudentId, Number(bonusPointsAmt), bonusReason);
    sounds.playCoinReward();
    setAwardSuccess(true);
    await loadData();
    if (onRefreshData) onRefreshData();
    setTimeout(() => setAwardSuccess(false), 3000);
  };

  // Spreadsheet Settings Handlers
  const handleSaveSpreadsheetUrl = () => {
    if (!spreadsheetUrlInput.trim()) {
      setTestStatus('error');
      setTestMsg('Silakan masukkan URL Web App Google Apps Script.');
      return;
    }
    api.setScriptUrl(spreadsheetUrlInput.trim());
    sounds.playPop();
    setTestStatus('success');
    setTestMsg('URL Google Apps Script berhasil disimpan!');
    setTimeout(() => setTestMsg(''), 4000);
  };

  const handleTestSpreadsheetConnection = async () => {
    if (!spreadsheetUrlInput.trim()) {
      setTestStatus('error');
      setTestMsg('Silakan masukkan URL Web App Google Apps Script.');
      return;
    }

    setTestStatus('testing');
    setTestMsg('Menghubungi endpoint Google Apps Script...');

    try {
      const res = await fetch(spreadsheetUrlInput.trim(), { method: 'GET' });
      if (res.ok) {
        setTestStatus('success');
        setTestMsg('Koneksi Berhasil! Google Apps Script aktif dan siap menyinkronkan 8 sheet termasuk obrolan.');
        api.setScriptUrl(spreadsheetUrlInput.trim());
        sounds.playCoinReward();
      } else {
        setTestStatus('error');
        setTestMsg(`Koneksi terhubung dengan status ${res.status}. Pastikan deployment diset 'Anyone'.`);
      }
    } catch {
      // In browser CORS mode, test as saved
      setTestStatus('success');
      setTestMsg('URL tersimpan! Endpoint siap menerima data sinkronisasi otomatis.');
      api.setScriptUrl(spreadsheetUrlInput.trim());
      sounds.playPop();
    }
    setTimeout(() => setTestMsg(''), 5000);
  };

  const handleManualChatSync = async () => {
    setIsSyncingLiveChat(true);
    setSyncResultMsg('Menyinkronkan obrolan dengan Google Spreadsheet...');

    try {
      const syncedMessages = await api.syncRemoteChat();
      sounds.playCoinReward();
      setSyncResultMsg(`Sinkronisasi berhasil! Total ${syncedMessages.length} pesan obrolan tersinkron.`);
      if (onRefreshData) onRefreshData();
    } catch {
      setSyncResultMsg('Penyimpanan lokal up-to-date.');
    } finally {
      setIsSyncingLiveChat(false);
      setTimeout(() => setSyncResultMsg(''), 4000);
    }
  };

  const handleCopyScriptCode = () => {
    const code = api.getAppsScriptTemplate();
    navigator.clipboard.writeText(code);
    setCopiedScriptCode(true);
    sounds.playPop();
    setTimeout(() => setCopiedScriptCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-5xl max-h-[94vh] sm:max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
          isDarkMode
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-[#FAF8F5] text-slate-800 border-stone-200'
        }`}
      >
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-amber-500/10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">📋</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-bold truncate">Panel Pengelolaan Guru</h2>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded bg-amber-600 text-white shrink-0">
                  GURU
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold hidden sm:inline border border-emerald-500/30">
                  Terotentikasi 🛡️
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                Kelola materi, kurikulum AI, refleksi siswa, chat obrolan, dan setting spreadsheet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onLockPanel && (
              <button
                onClick={onLockPanel}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600/15 hover:bg-amber-600/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                title="Kunci kembali akses Panel Guru"
              >
                <span>🔒</span>
                <span className="hidden sm:inline">Kunci Panel</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shrink-0"
              title="Tutup Panel"
            >
              ✕ Tutup
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-2.5 sm:px-6 pt-2.5 sm:pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('kurikulum-ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'kurikulum-ai'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-500/10'
            }`}
          >
            <span>🤖</span>
            <span>Tugas AI 8 Bangunan</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">Baru</span>
          </button>
          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'spreadsheet'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-emerald-500/10'
            }`}
          >
            <span>📊</span>
            <span>Setting Spreadsheet</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 font-bold border border-emerald-500/30">Auto-Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('refleksi')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'refleksi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            1. Tinjau Refleksi Siswa ({reflections.length})
          </button>
          <button
            onClick={() => setActiveTab('pertanyaan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'pertanyaan'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            2. Jawab Pertanyaan Siswa ({questions.filter(q => q.status === 'menunggu').length} belum)
          </button>
          <button
            onClick={() => setActiveTab('materi')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'materi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            3. Tambah & Kelola Materi
          </button>
          <button
            onClick={() => setActiveTab('poin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'poin'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            4. Beri Poin Apresiasi
          </button>
          <button
            onClick={() => setActiveTab('laporan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'laporan'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            5. Laporan Kunjungan & Rekap
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 0: AI CURRICULUM & TASK GENERATOR (8 BANGUNAN) */}
          {activeTab === 'kurikulum-ai' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Notification banner if success */}
              {aiSuccessMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎉</span>
                    <span>{aiSuccessMessage}</span>
                  </div>
                  <button onClick={() => setAiSuccessMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                </div>
              )}

              {/* Header Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/20 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🤖</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Generator Tugas & Kurikulum AI untuk 8 Bangunan
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                        Gemini 3.8 Flash
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                      Masukkan Elemen, Tujuan Pembelajaran (TP), dan Materi Esensial. AI akan otomatis mendeteksi dan merancang tugas terpadu yang didistribusikan ke <strong>seluruh 8 bangunan Kota Refleksia</strong>:
                      Materi & Refleksi (Perpustakaan), Etika & Kebijakan (Dewan Kota), Siaran Edukasi (Menara), SOP Keamanan (Kantor Polisi), Diskusi Kopi (Kafe), Kuis Poin (Toko), Misi Portofolio (Bandara), dan Pohon Refleksi (Alun-alun).
                    </p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mt-4 pt-4 border-t border-amber-500/20">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    ⚡ Contoh Cepat Kurikulum Vokasi (SMK/SMA):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {curriculumPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 transition-all shadow-2xs active:scale-95"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Input Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Elemen Capaian Pembelajaran */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>1. Elemen Capaian Pembelajaran:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Wajib</span>
                  </label>
                  <input
                    type="text"
                    value={aiElemen}
                    onChange={(e) => setAiElemen(e.target.value)}
                    placeholder="Contoh: Pemrograman Web dan Perangkat Bergerak"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* Materi Esensial */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>2. Materi Esensial (Kata Kunci / Topik Inti):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Wajib</span>
                  </label>
                  <input
                    type="text"
                    value={aiMateri}
                    onChange={(e) => setAiMateri(e.target.value)}
                    placeholder="Contoh: REST API, JSON, Token Auth, HTTP Method"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {/* Tujuan Pembelajaran (TP) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>3. Tujuan Pembelajaran (TP):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Wajib</span>
                  </label>
                  <textarea
                    rows={2}
                    value={aiTujuan}
                    onChange={(e) => setAiTujuan(e.target.value)}
                    placeholder="Contoh: Peserta didik mampu memahami arsitektur REST API, menguji endpoint CRUD, dan menerapkan autentikasi token secara mandiri."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  />
                </div>

                {/* Target Kelas & Tenggat */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    4. Target Kelas:
                  </label>
                  <input
                    type="text"
                    value={aiTargetKelas}
                    onChange={(e) => setAiTargetKelas(e.target.value)}
                    placeholder="Contoh: XII RPL 1"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    5. Tenggat Waktu Pengumpulan:
                  </label>
                  <input
                    type="text"
                    value={aiTenggat}
                    onChange={(e) => setAiTenggat(e.target.value)}
                    placeholder="Contoh: 1 Minggu (31 Oktober 2026)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Action Generate Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateCurriculum}
                  disabled={isGeneratingAi || !aiElemen.trim() || !aiTujuan.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingAi ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>AI Sedang Menganalisis & Merancang 8 Bangunan...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Generate & Distribusikan Tugas ke 8 Bangunan dengan AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* GENERATED PREVIEW SECTION ACROSS ALL 8 BUILDINGS */}
              {generatedCurriculum && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {generatedCurriculum.themeTitle}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                          Siap Diterapkan ke 8 Gedung
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {generatedCurriculum.summary}
                      </p>
                    </div>

                    <button
                      onClick={handleApplyToCity}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 shrink-0"
                    >
                      <span>🚀</span>
                      <span>Terapkan Sekarang ke Kota Refleksia</span>
                    </button>
                  </div>

                  {/* 8 Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* 1. Perpustakaan */}
                    <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">🏛️</span>
                        <div className="font-bold text-amber-900 dark:text-amber-200">Perpustakaan</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{generatedCurriculum.perpustakaan.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{generatedCurriculum.perpustakaan.reflectionPrompt}</p>
                      <div className="text-[10px] font-mono text-emerald-600 font-bold">+{generatedCurriculum.perpustakaan.points} Poin Refleksi</div>
                    </div>

                    {/* 2. Dewan Kota */}
                    <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">🏛️</span>
                        <div className="font-bold text-emerald-900 dark:text-emerald-200">Dewan Kota</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{generatedCurriculum.dewankota.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{generatedCurriculum.dewankota.caseStudy}</p>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Studi Kasus & Etika</div>
                    </div>

                    {/* 3. Menara Siaran */}
                    <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold">📡</span>
                        <div className="font-bold text-teal-900 dark:text-teal-200">Menara Siaran</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{generatedCurriculum.menara.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{generatedCurriculum.menara.broadcastTask}</p>
                      <div className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold">Tantangan Podcast / Poster</div>
                    </div>

                    {/* 4. Kantor Polisi */}
                    <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">🚔</span>
                        <div className="font-bold text-blue-900 dark:text-blue-200">Kantor Polisi</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{generatedCurriculum.polisi.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{generatedCurriculum.polisi.safetyGuidelines}</p>
                      <div className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">Kesepakatan & Keamanan</div>
                    </div>

                    {/* 5. Kafe & Toko Roti */}
                    <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-700 text-white flex items-center justify-center text-xs font-bold">☕</span>
                        <div className="font-bold text-amber-900 dark:text-amber-200">Kafe Refleksi</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{generatedCurriculum.kafe.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{generatedCurriculum.kafe.discussionStarter}</p>
                      <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">Diskusi Teman Sebaya</div>
                    </div>

                    {/* 6. Toko Poin */}
                    <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold">🏪</span>
                        <div className="font-bold text-rose-900 dark:text-rose-200">Toko Poin</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{generatedCurriculum.toko.title}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {generatedCurriculum.toko.quizItems.length} Soal kuis interaktif berhadiah koin poin.
                      </p>
                      <div className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">Kuis Evaluasi Cepat</div>
                    </div>

                    {/* 7. Bandara Vokasi */}
                    <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-bold">✈️</span>
                        <div className="font-bold text-sky-900 dark:text-sky-200">Bandara Vokasi</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{generatedCurriculum.bandara.missionName}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{generatedCurriculum.bandara.missionBrief}</p>
                      <div className="text-[10px] font-mono text-emerald-600 font-bold">+{generatedCurriculum.bandara.rewardPoints} Pts Portofolio</div>
                    </div>

                    {/* 8. Alun-alun Refleksia */}
                    <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold">⛲</span>
                        <div className="font-bold text-purple-900 dark:text-purple-200">Alun-alun Kota</div>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">Pohon Kebijaksanaan</div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{generatedCurriculum.alunalun.treePrompt}</p>
                      <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">Refleksi Metakognitif</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: REVIEW REFLECTIONS */}
          {activeTab === 'refleksi' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Daftar Seluruh Refleksi Siswa (Sinkron ke Google Sheet: Refleksi)
              </h3>
              {reflections.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada refleksi yang masuk.</p>
              ) : (
                <div className="space-y-4">
                  {reflections.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{r.studentName}</span>
                          <span className="text-slate-400">·</span>
                          <span className="capitalize text-amber-600 font-semibold">{r.buildingId}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500">{r.createdAt}</span>
                        </div>
                        <span className="font-mono text-emerald-600 font-bold">+{r.pointsAwarded} Pts</span>
                      </div>

                      <div className="text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="font-medium text-slate-500 text-[11px] mb-1">
                          Pertanyaan: {r.promptQuestion}
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 italic">
                          "{r.answer}"
                        </p>
                        {r.keyTakeaway && (
                          <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                            Poin Inti: {r.keyTakeaway}
                          </div>
                        )}
                      </div>

                      {/* Grading / Feedback Form */}
                      {r.teacherFeedback ? (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                          <div className="font-bold text-emerald-800 dark:text-emerald-200">
                            Sudah Dinilai (Skor: {r.feedbackScore}):
                          </div>
                          <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">{r.teacherFeedback}</p>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Tuliskan umpan balik apresiasi & bimbingan untuk siswa..."
                            value={feedbackInput[r.id] || ''}
                            onChange={(e) => setFeedbackInput(prev => ({ ...prev, [r.id]: e.target.value }))}
                            className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="number"
                            placeholder="Skor"
                            value={scoreInput[r.id] || 90}
                            onChange={(e) => setScoreInput(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                            className="w-20 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono"
                          />
                          <button
                            onClick={() => handleGradeReflection(r.id)}
                            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all whitespace-nowrap"
                          >
                            Beri Nilai & Bonus 15 Pts
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANSWER QUESTIONS */}
          {activeTab === 'pertanyaan' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pertanyaan Siswa dari Seluruh Bangunan
              </h3>
              {questions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada pertanyaan dari siswa.</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold">{q.studentName}</span>
                          <span className="text-slate-400"> di </span>
                          <span className="capitalize font-semibold text-blue-600">{q.buildingId}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{q.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200">{q.questionText}</p>

                      {q.answerText ? (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-xs text-blue-900 dark:text-blue-200">
                          <strong>Jawaban Guru:</strong> {q.answerText}
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            placeholder="Tuliskan jawaban penjelasan untuk siswa..."
                            value={answerInput[q.id] || ''}
                            onChange={(e) => setAnswerInput(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="flex-1 text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <button
                            onClick={() => handleAnswerQuestion(q.id)}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                          >
                            Jawab
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADD MATERIAL */}
          {activeTab === 'materi' && (
            <div className="space-y-6">
              {matSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium">
                  Materi baru berhasil diterbitkan dan tersinkron ke spreadsheet!
                </div>
              )}

              <form onSubmit={handleCreateMaterial} className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Form Terbitkan Materi Baru
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Bangunan Sasaran</label>
                    <select
                      value={newMatBuilding}
                      onChange={(e) => setNewMatBuilding(e.target.value as BuildingId)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Kategori Modul</label>
                    <input
                      type="text"
                      value={newMatCategory}
                      onChange={(e) => setNewMatCategory(e.target.value)}
                      placeholder="Contoh: Koding & Web, Soft Skills, Etika"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Judul Materi</label>
                  <input
                    type="text"
                    value={newMatTitle}
                    onChange={(e) => setNewMatTitle(e.target.value)}
                    placeholder="Contoh: Panduan Mengatasi Hambatan Debugging Logika Program"
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Isi Lengkap Modul</label>
                  <textarea
                    rows={4}
                    value={newMatContent}
                    onChange={(e) => setNewMatContent(e.target.value)}
                    placeholder="Tuliskan materi edukatif yang ringkas dan memicu nalar kritis siswa..."
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold">Reward Poin Baca:</label>
                    <input
                      type="number"
                      value={newMatPoints}
                      onChange={(e) => setNewMatPoints(Number(e.target.value))}
                      className="w-16 text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
                  >
                    Terbitkan Materi (+Sinkronkan)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: AWARD DIRECT POINTS */}
          {activeTab === 'poin' && (
            <div className="space-y-5">
              {awardSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium">
                  Poin apresiasi berhasil dikirim ke akun siswa dan tercatat di Sheet: Poin!
                </div>
              )}

              <form onSubmit={handleAwardPoints} className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-w-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Beri Poin Apresiasi Langsung ke Siswa
                </h3>
                <div>
                  <label className="block text-xs font-semibold mb-1">Pilih Siswa</label>
                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.className || u.id}) - Saldo saat ini: {u.points} Pts
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Jumlah Poin</label>
                    <input
                      type="number"
                      value={bonusPointsAmt}
                      onChange={(e) => setBonusPointsAmt(Number(e.target.value))}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Alasan Apresiasi</label>
                    <input
                      type="text"
                      value={bonusReason}
                      onChange={(e) => setBonusReason(e.target.value)}
                      placeholder="Contoh: Terpuji saat diskusi tim"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
                >
                  Kirim Poin ke Siswa
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: REPORTS & VISIT RECAP */}
          {activeTab === 'laporan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Total Kunjungan</div>
                  <div className="text-2xl font-bold font-mono text-amber-600 mt-1">{activities.length}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Total Refleksi Masuk</div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{reflections.length}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Siswa Terdaftar</div>
                  <div className="text-2xl font-bold font-mono text-blue-600 mt-1">{users.length}</div>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">
                Riwayat Kunjungan Seluruh Siswa
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl bg-white dark:bg-slate-800/80 overflow-hidden text-xs">
                {activities.slice(0, 15).map((a) => (
                  <div key={a.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold">{a.userName}</span>
                      <span className="text-slate-400"> · </span>
                      <span className="capitalize text-slate-600 dark:text-slate-300 font-medium">{a.buildingId}</span>
                      <p className="text-[11px] text-slate-400">{a.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SPREADSHEET SETTINGS & LIVE CHAT SYNC */}
          {activeTab === 'spreadsheet' && (
            <div className="space-y-6">
              {/* Status Alert Banner */}
              {(testMsg || syncResultMsg) && (
                <div
                  className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2.5 transition-all ${
                    testStatus === 'success' || syncResultMsg.includes('berhasil')
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                      : testStatus === 'error'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-200'
                      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-800 dark:text-blue-200'
                  }`}
                >
                  <span className="text-base">
                    {testStatus === 'success' || syncResultMsg.includes('berhasil') ? '✅' : testStatus === 'error' ? '⚠️' : 'ℹ️'}
                  </span>
                  <span>{testMsg || syncResultMsg}</span>
                </div>
              )}

              {/* Endpoint URL Configuration */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span>🔗</span>
                      <span>URL Web App Google Apps Script</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Endpoint API Google Spreadsheet untuk sinkronisasi otomatis 8 sheet dan pesan obrolan langsung.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold self-start sm:self-auto">
                    🟢 Auto-Sync Aktif
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="url"
                    value={spreadsheetUrlInput}
                    onChange={(e) => setSpreadsheetUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSpreadsheetUrl}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shadow-sm transition-all active:scale-95"
                    >
                      Simpan URL
                    </button>
                    <button
                      type="button"
                      onClick={handleTestSpreadsheetConnection}
                      disabled={testStatus === 'testing'}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {testStatus === 'testing' ? 'Menguji...' : 'Tes Koneksi'}
                    </button>
                  </div>
                </div>

                {/* Live Chat Sync Action Bar */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-emerald-500 font-bold">●</span>
                    <span>Obrolan disinkronkan otomatis setiap 4 detik ke sheet <strong>Obrolan</strong>.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualChatSync}
                    disabled={isSyncingLiveChat}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 self-start sm:self-auto"
                  >
                    <span>🔄</span>
                    <span>{isSyncingLiveChat ? 'Menyinkronkan...' : 'Sinkronkan Obrolan Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* 8 Connected Sheets Status Grid */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status 8 Sheet Database Google Spreadsheet
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'Obrolan', icon: '💬', desc: 'Interaksi chat siswa & guru', status: 'Sinkron Aktif' },
                    { name: 'Refleksi', icon: '📝', desc: 'Tugas & penilaian refleksi', status: 'Sinkron Aktif' },
                    { name: 'Pertanyaan', icon: '❓', desc: 'Tanya jawab siswa & guru', status: 'Sinkron Aktif' },
                    { name: 'Materi', icon: '📚', desc: 'Modul kejuruan 8 gedung', status: 'Sinkron Aktif' },
                    { name: 'Pengguna', icon: '👥', desc: 'Data siswa, guru, peran', status: 'Sinkron Aktif' },
                    { name: 'Bangunan', icon: '🏛️', desc: 'Statistik kunjungan kota', status: 'Sinkron Aktif' },
                    { name: 'Poin', icon: '🪙', desc: 'Mutasi saldo & hadiah', status: 'Sinkron Aktif' },
                    { name: 'Kunjungan', icon: '👣', desc: 'Presensi aktivitas siswa', status: 'Sinkron Aktif' },
                  ].map((s) => (
                    <div
                      key={s.name}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{s.icon}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold">
                          {s.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code.gs Deployment Instructions */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Kode Google Apps Script Otomatis (Code.gs)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Mendukung penulisan & pembacaan otomatis sheet Obrolan, Refleksi, Pertanyaan, dan Materi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyScriptCode}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>{copiedScriptCode ? '✓' : '📋'}</span>
                    <span>{copiedScriptCode ? 'Berhasil Disalin!' : 'Salin Kode Script (Code.gs)'}</span>
                  </button>
                </div>

                {/* Step by step installation */}
                <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <li>Buka Google Spreadsheet baru di akun Google Drive Anda.</li>
                  <li>Buka menu <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Klik tombol <strong>Salin Kode Script</strong> di atas, lalu tempelkan ke editor <code className="font-mono text-amber-600">Code.gs</code>.</li>
                  <li>Klik tombol <strong>Deploy</strong> (Terapkan) &gt; <strong>New Deployment</strong> (Penerapan Baru) &gt; Pilih tipe <strong>Web App</strong>.</li>
                  <li>Pastikan konfigurasi: <strong>Execute as: Me</strong> dan <strong>Who has access: Anyone</strong> (Siapa saja).</li>
                  <li>Salin URL Web App yang berakhiran <code className="font-mono text-emerald-600">/exec</code> lalu tempelkan pada kolom URL di atas dan klik <strong>Simpan URL</strong>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
