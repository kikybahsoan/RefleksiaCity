import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Building,
  Material,
  Reflection,
  Question,
  ActivityLog,
  User,
  ChatMessage,
  StoreItem,
  StickyReflection,
} from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { filterProfanity, REFLECTION_STARTERS } from '../utils/filter';
import { INITIAL_ANNOUNCEMENTS, INITIAL_CLASS_RULES, INITIAL_MISSIONS } from '../services/initialData';

interface BuildingModalProps {
  building: Building;
  currentUser: User;
  onClose: () => void;
  onPointsUpdated: (newPoints: number) => void;
  isDarkMode: boolean;
}

type TabType = 'materi' | 'refleksi' | 'tanya_guru' | 'aktivitas' | 'khusus';

export const BuildingModal: React.FC<BuildingModalProps> = ({
  building,
  currentUser,
  onClose,
  onPointsUpdated,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('materi');

  // Tab 1: Materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Tab 2: Reflection Form & History
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [understandingLevel, setUnderstandingLevel] = useState<Reflection['understandingLevel']>('sangat_paham');
  const [submittingReflection, setSubmittingReflection] = useState(false);
  const [reflectionSuccessMsg, setReflectionSuccessMsg] = useState('');

  // Tab 3: Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionSuccessMsg, setQuestionSuccessMsg] = useState('');

  // Tab 4: Activities
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Special Function Data:
  // Kafe: Room Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [reportSuccessId, setReportSuccessId] = useState<string | null>(null);

  // Toko: Store Items
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [redeemNotice, setRedeemNotice] = useState<string | null>(null);

  // Alun-alun: Sticky Notes Wall
  const [stickyNotes, setStickyNotes] = useState<StickyReflection[]>([]);
  const [newStickyText, setNewStickyText] = useState('');

  // Polisi: Report Form
  const [complaintText, setComplaintText] = useState('');
  const [complaintCategory, setComplaintCategory] = useState<'kendala_belajar' | 'perundungan' | 'saran'>('kendala_belajar');
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);

  // Log visit on enter
  useEffect(() => {
    api.logActivity({
      buildingId: building.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'kunjungan',
      description: `Masuk ke ${building.name}`,
      pointsChange: 2,
    }).then(() => {
      // Small bonus visit point
      api.updateUserPoints(currentUser.id, 2, `Kunjungan ke ${building.name}`).then(onPointsUpdated);
    });
  }, [building.id]);

  // Load building specific data
  const loadData = async () => {
    const [mats, refs, qs, acts] = await Promise.all([
      api.getMaterials(building.id),
      api.getReflections(building.id),
      api.getQuestions(building.id),
      api.getActivities(building.id),
    ]);
    setMaterials(mats);
    setSelectedMaterial(mats[0] || null);
    setReflections(refs);
    setQuestions(qs);
    setActivities(acts);

    if (building.id === 'kafe') {
      const msgs = await api.getChatMessages('kafe');
      setChatMessages(msgs);
    } else if (building.id === 'toko') {
      const items = await api.getStoreItems();
      setStoreItems(items);
    } else if (building.id === 'alunalun') {
      const notes = await api.getStickyNotes();
      setStickyNotes(notes);
    }
  };

  useEffect(() => {
    loadData();
  }, [building.id]);

  // Polling for Kafe Chat (5 seconds interval as requested)
  useEffect(() => {
    if (building.id !== 'kafe') return;
    const interval = setInterval(async () => {
      const msgs = await api.getChatMessages('kafe');
      setChatMessages(msgs);
    }, 5000);
    return () => clearInterval(interval);
  }, [building.id]);

  // Submit Reflection Handler
  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionAnswer.trim()) return;

    setSubmittingReflection(true);
    const { cleanText } = filterProfanity(reflectionAnswer);

    try {
      const prompt = selectedMaterial?.title
        ? `Refleksi terkait materi: "${selectedMaterial.title}"`
        : `Refleksi pembelajaran di ${building.name}`;

      const newRef = await api.submitReflection({
        buildingId: building.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        promptQuestion: prompt,
        answer: cleanText,
        understandingLevel,
        keyTakeaway: keyTakeaway.trim() || 'Pembelajaran bernalar kritis',
        pointsAwarded: 25,
      });

      // Reward effects
      sounds.playCoinReward();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#F59E0B', '#10B981', '#3B82F6'],
      });

      setReflections(prev => [newRef, ...prev]);
      setReflectionAnswer('');
      setKeyTakeaway('');
      setReflectionSuccessMsg('Refleksi berhasil dikirim! Kamu mendapatkan +25 Poin.');
      onPointsUpdated(currentUser.points + 25);

      setTimeout(() => setReflectionSuccessMsg(''), 4500);
    } finally {
      setSubmittingReflection(false);
    }
  };

  // Submit Question Handler
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setSubmittingQuestion(true);
    const { cleanText } = filterProfanity(newQuestionText);

    try {
      const newQ = await api.submitQuestion({
        buildingId: building.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        questionText: cleanText,
      });

      sounds.playPop();
      setQuestions(prev => [newQ, ...prev]);
      setNewQuestionText('');
      setQuestionSuccessMsg('Pertanyaan berhasil dikirim ke Guru (+5 Poin)! Guru akan membalas segera.');
      onPointsUpdated(currentUser.points + 5);

      setTimeout(() => setQuestionSuccessMsg(''), 4500);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Send Kafe Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const { cleanText } = filterProfanity(chatInput);
    const newMsg = await api.sendChatMessage({
      room: 'kafe',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: cleanText,
    });

    sounds.playPop();
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  // Report Chat Message
  const handleReportMessage = async (msgId: string) => {
    await api.reportChatMessage(msgId);
    setReportSuccessId(msgId);
    setTimeout(() => setReportSuccessId(null), 3000);
  };

  // Redeem Store Item
  const handleRedeemItem = async (itemId: string) => {
    const res = await api.redeemStoreItem(currentUser.id, itemId);
    setRedeemNotice(res.message);
    if (res.success) {
      sounds.playCoinReward();
      confetti({ particleCount: 50, spread: 45 });
      const items = await api.getStoreItems();
      setStoreItems(items);
      const updated = api.getCurrentUser();
      if (updated) onPointsUpdated(updated.points);
    }
    setTimeout(() => setRedeemNotice(null), 4000);
  };

  // Submit Sticky Reflection Note (Alun-alun)
  const handleAddSticky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim()) return;

    const { cleanText } = filterProfanity(newStickyText);
    const colors = ['#FEF3C7', '#ECFDF5', '#EDE9FE', '#E0F2FE'];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    const note = await api.addStickyNote({
      author: currentUser.name,
      authorRole: currentUser.role,
      text: cleanText,
      color: chosenColor,
    });

    sounds.playCoinReward();
    setStickyNotes(prev => [note, ...prev]);
    setNewStickyText('');
    api.updateUserPoints(currentUser.id, 10, 'Berbagi catatan di Pohon Refleksi Alun-alun').then(onPointsUpdated);
  };

  // Submit Police Report / Kotak Curhat
  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;
    setComplaintSubmitted(true);
    sounds.playPop();
    setTimeout(() => {
      setComplaintText('');
      setComplaintSubmitted(false);
    }, 4000);
  };

  // Determine label for the 5th "Fungsi Khusus" tab
  const getSpecialTabName = () => {
    switch (building.id) {
      case 'kafe': return 'Obrolan Kafe';
      case 'toko': return 'Katalog Hadiah';
      case 'bandara': return 'Misi Karir & Jurnal';
      case 'menara': return 'Siaran Guru';
      case 'polisi': return 'Kesepakatan & Aduan';
      case 'alunalun': return 'Pohon Refleksi Bersama';
      case 'dewankota': return 'Aspirasi & Forum';
      default: return 'Fokus Gedung';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-4xl max-h-[94vh] sm:max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border transition-colors ${
          isDarkMode
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-[#FAF8F5] text-slate-800 border-stone-200'
        }`}
      >
        {/* Header Zone: Building Identity + Back/Close Button */}
        <div
          className="px-3.5 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between border-b"
          style={{
            borderColor: isDarkMode ? '#1E293B' : '#E7E5E4',
            backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
              style={{ backgroundColor: building.accentColor }}
            >
              🏛️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-bold tracking-tight truncate">
                  {building.name}
                </h2>
                {building.roleBadgeText && (
                  <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 shrink-0">
                    {building.roleBadgeText}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                {building.tagline}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Kembali ke Peta Kota"
          >
            <span className="text-xs sm:text-sm font-semibold">✕ Tutup</span>
          </button>
        </div>

        {/* 4 Standard Tabs + 1 Building-Specific Tab */}
        <div
          className="flex items-center gap-1 px-2.5 sm:px-6 pt-2 sm:pt-3 pb-2 border-b overflow-x-auto no-scrollbar"
          style={{ borderColor: isDarkMode ? '#1E293B' : '#E7E5E4' }}
        >
          <button
            onClick={() => setActiveTab('materi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'materi'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            1. Materi Belajar ({materials.length})
          </button>

          <button
            onClick={() => setActiveTab('refleksi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'refleksi'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            2. Tulis Refleksi (+25 Poin)
          </button>

          <button
            onClick={() => setActiveTab('tanya_guru')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'tanya_guru'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            3. Tanya Guru ({questions.length})
          </button>

          <button
            onClick={() => setActiveTab('aktivitas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'aktivitas'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            4. Riwayat Aktivitas
          </button>

          <button
            onClick={() => setActiveTab('khusus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
              activeTab === 'khusus'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            ★ {getSpecialTabName()}
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: MATERI */}
          {activeTab === 'materi' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Materials List */}
              <div className="md:col-span-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Daftar Modul Pembelajaran
                </h3>
                {materials.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada materi untuk bangunan ini.</p>
                ) : (
                  materials.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMaterial(m)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedMaterial?.id === m.id
                          ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 shadow-sm'
                          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        <span>{m.category}</span>
                        <span>{m.readTime}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {m.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {m.excerpt}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          +{m.pointsReward} Poin Baca
                        </span>
                        <span className="text-slate-400">{m.author}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Material Reading View */}
              <div className="md:col-span-7">
                {selectedMaterial ? (
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span>{selectedMaterial.category}</span>
                        <span>·</span>
                        <span>{selectedMaterial.readTime}</span>
                        <span>·</span>
                        <span>{selectedMaterial.date}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {selectedMaterial.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Disusun oleh: {selectedMaterial.author}
                      </p>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {selectedMaterial.content}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Sudah selesai membaca materi ini?
                      </span>
                      <button
                        onClick={() => {
                          sounds.playPop();
                          setActiveTab('refleksi');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <span>Lanjut Tulis Refleksi</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Pilih materi di sebelah kiri untuk mulai membaca.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REFLEKSI (TULIS & KIRIM KE SPREADSHEET) */}
          {activeTab === 'refleksi' && (
            <div className="space-y-6">
              {reflectionSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                  <span>🎉</span>
                  <span>{reflectionSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitReflection} className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pertanyaan Pemantik Refleksi
                  </label>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/70 dark:border-amber-900/50">
                    {selectedMaterial?.title
                      ? `Bagaimana materi "${selectedMaterial.title}" mengubah cara pandangmu dan apa langkah konkrit yang akan kamu lakukan?`
                      : `Apa hal paling berkesan yang kamu pelajari di ${building.name} hari ini?`}
                  </p>
                </div>

                {/* Quick reflection starters */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Inspirasi kalimat pembuka:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {REFLECTION_STARTERS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReflectionAnswer(prev => (prev ? `${prev} ${s}` : s))}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reflection Text Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jawaban & Penjelasan Reflektifmu <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={reflectionAnswer}
                    onChange={(e) => setReflectionAnswer(e.target.value)}
                    placeholder="Tuliskan pengalaman, kejujuran pikiran, atau evaluasi belajarmu dengan bahasa yang santun..."
                    required
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Key Takeaway */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kesimpulan Inti (1 Kalimat)
                    </label>
                    <input
                      type="text"
                      value={keyTakeaway}
                      onChange={(e) => setKeyTakeaway(e.target.value)}
                      placeholder="Contoh: Selalu verifikasi sumber sebelum mengutip"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Understanding Level */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tingkat Pemahaman Diri
                    </label>
                    <select
                      value={understandingLevel}
                      onChange={(e) => setUnderstandingLevel(e.target.value as Reflection['understandingLevel'])}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="sangat_paham">🌟 Sangat Paham & Siap Terapkan</option>
                      <option value="paham">👍 Paham Sebagian Besar</option>
                      <option value="cukup">🤔 Cukup Paham, Butuh Latihan</option>
                      <option value="perlu_bimbingan">❓ Perlu Bimbingan Tambahan Guru</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Refleksi disimpan ke Google Spreadsheet (Sheet: Refleksi)
                  </div>
                  <button
                    type="submit"
                    disabled={submittingReflection || !reflectionAnswer.trim()}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>{submittingReflection ? 'Menyimpan...' : 'Kirim Refleksi (+25 Poin)'}</span>
                    <span>✨</span>
                  </button>
                </div>
              </form>

              {/* Reflection History List for this building */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Catatan Refleksi Terakhir di Gedung Ini ({reflections.length})
                </h3>
                {reflections.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada refleksi yang tercatat di sini.</p>
                ) : (
                  reflections.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.studentName}
                        </span>
                        <span className="text-slate-400 text-[11px]">{r.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                        "{r.answer}"
                      </p>
                      {r.keyTakeaway && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                          Inti: {r.keyTakeaway}
                        </div>
                      )}
                      {r.teacherFeedback && (
                        <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200">
                          <span className="font-bold">Umpan Balik Guru ({r.feedbackScore} pts):</span> {r.teacherFeedback}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TANYA GURU */}
          {activeTab === 'tanya_guru' && (
            <div className="space-y-6">
              {questionSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                  {questionSuccessMsg}
                </div>
              )}

              {/* Ask Question Form */}
              <form onSubmit={handleSubmitQuestion} className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ajukan Pertanyaan Kritis ke Guru
                </label>
                <textarea
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Contoh: Bu, saya masih ragu dalam memilih lisensi open source untuk karya proyek saya..."
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Mendapatkan +5 Poin keaktifan
                  </span>
                  <button
                    type="submit"
                    disabled={submittingQuestion || !newQuestionText.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {submittingQuestion ? 'Mengirim...' : 'Kirim ke Guru'}
                  </button>
                </div>
              </form>

              {/* Questions List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Daftar Tanya Jawab ({questions.length})
                </h3>
                {questions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada pertanyaan di gedung ini.</p>
                ) : (
                  questions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {q.studentName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          q.status === 'dijawab'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}>
                          {q.status === 'dijawab' ? 'Dijawab' : 'Menunggu Jawaban'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {q.questionText}
                      </p>

                      {q.answerText ? (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                          <div className="flex items-center justify-between text-blue-900 dark:text-blue-300 font-semibold text-[11px]">
                            <span>Jawaban dari: {q.answeredBy || 'Guru Pembimbing'}</span>
                            <span className="text-slate-400 font-normal">{q.answeredAt}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{q.answerText}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Pertanyaan telah masuk ke panel guru.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AKTIVITAS & POIN DI GEDUNG INI */}
          {activeTab === 'aktivitas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Log Jejak Kunjungan & Perolehan Poin
                </h3>
                <span className="text-xs text-slate-500">Tersimpan ke Sheet: Kunjungan</span>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada riwayat aktivitas di gedung ini.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl bg-white dark:bg-slate-800/80 overflow-hidden">
                  {activities.map((a) => (
                    <div key={a.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {a.userName} · <span className="capitalize text-slate-500 font-normal">{a.action}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          {a.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold ${
                            a.pointsChange > 0 ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          {a.pointsChange > 0 ? `+${a.pointsChange}` : a.pointsChange} Pts
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{a.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FUNGSI KHUSUS GEDUNG */}
          {activeTab === 'khusus' && (
            <div>
              {/* KAFE: Obrolan Ruang Langsung (5s Polling & Profanity Filter) */}
              {building.id === 'kafe' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Obrolan Kafe Kopi Refleksi</h3>
                      <p className="text-xs text-slate-500">
                        Ruang santai diskusi siswa & guru (Pembaruan tiap 5 detik).
                      </p>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">● Terhubung Langsung</span>
                  </div>

                  {/* Chat Message Stream */}
                  <div className="h-64 overflow-y-auto p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-3">
                    {chatMessages.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">Belum ada obrolan. Mulai sapa teman-temanmu!</p>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {msg.senderName}
                            </span>
                            {msg.senderRole === 'guru' && (
                              <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 font-bold">GURU</span>
                            )}
                            <span>·</span>
                            <span>{msg.timestamp}</span>
                            {msg.senderId !== currentUser.id && (
                              <button
                                onClick={() => handleReportMessage(msg.id)}
                                className="text-[10px] text-slate-400 hover:text-red-500 underline ml-1"
                                title="Laporkan pesan ini ke guru"
                              >
                                {reportSuccessId === msg.id ? 'Dilaporkan!' : 'Laporkan'}
                              </button>
                            )}
                          </div>
                          <div
                            className={`px-3 py-2 rounded-2xl text-xs max-w-sm ${
                              msg.senderId === currentUser.id
                                ? 'bg-amber-500 text-white rounded-br-none'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                            } ${msg.reported ? 'opacity-60 line-through' : ''}`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Send Chat Bar */}
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ketik pesan santun (filter kata kasar aktif)..."
                      className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-all"
                    >
                      Kirim
                    </button>
                  </form>
                </div>
              )}

              {/* TOKO POIN: Tukar Poin Siswa */}
              {building.id === 'toko' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Katalog Penukaran Poin Belajar</h3>
                      <p className="text-xs text-slate-500">Saldo Poin Kamu: {currentUser.points} Pts</p>
                    </div>
                  </div>

                  {redeemNotice && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs">
                      {redeemNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {storeItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              {item.price} Poin
                            </span>
                            <span className="text-[10px] text-slate-400">Sisa stok: {item.stock}</span>
                          </div>
                          <h4 className="text-sm font-semibold">{item.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {item.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRedeemItem(item.id)}
                          disabled={currentUser.points < item.price || item.stock <= 0}
                          className="mt-3 w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
                        >
                          {currentUser.points < item.price ? 'Poin Belum Cukup' : 'Tukar Sekarang'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ALUN-ALUN: Pohon Refleksi Bersama & Sticky Notes */}
              {building.id === 'alunalun' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Pohon Refleksi Alun-alun Kota</h3>
                      <p className="text-xs text-slate-500">
                        Bagikan kalimat mutiara & motivasi belajarmu untuk dibaca seluruh sekolah!
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddSticky} className="flex gap-2">
                    <input
                      type="text"
                      value={newStickyText}
                      onChange={(e) => setNewStickyText(e.target.value)}
                      placeholder="Tulis pesan semangat atau refleksi pendek di daun pohon (+10 Pts)..."
                      className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!newStickyText.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                    >
                      Tempelkan
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {stickyNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl shadow-sm text-slate-900 border border-black/5 flex flex-col justify-between"
                        style={{ backgroundColor: note.color }}
                      >
                        <p className="text-xs font-medium leading-relaxed">
                          "{note.text}"
                        </p>
                        <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[11px] text-slate-700">
                          <span className="font-semibold">{note.author}</span>
                          <button
                            onClick={() => {
                              sounds.playPop();
                              api.likeStickyNote(note.id).then(() => {
                                api.getStickyNotes().then(setStickyNotes);
                              });
                            }}
                            className="hover:scale-110 transition-transform font-bold"
                          >
                            ❤️ {note.likes}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MENARA SIARAN: Pengumuman Guru & Podcast */}
              {building.id === 'menara' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold">Warta & Siaran Informasi Resmi Sekolah</h3>
                  <div className="space-y-3">
                    {INITIAL_ANNOUNCEMENTS.map((ann) => (
                      <div
                        key={ann.id}
                        className={`p-4 rounded-xl border ${
                          ann.important
                            ? 'border-red-300 bg-red-50/70 dark:bg-red-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {ann.important ? '🚨 PENGUMUMAN PENTING' : '📢 WARTA GURU'}
                          </span>
                          <span className="text-slate-400">{ann.date}</span>
                        </div>
                        <h4 className="text-sm font-bold">{ann.title}</h4>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          {ann.content}
                        </p>
                        <div className="text-[11px] text-slate-400 mt-2">Oleh: {ann.author}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* POLISI: Kesepakatan Kelas & Lapor Kendala Aman */}
              {building.id === 'polisi' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold mb-2">Kesepakatan & Budaya Positif Kelas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {INITIAL_CLASS_RULES.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 text-xs"
                        >
                          <span className="text-[10px] uppercase font-bold text-blue-600">{r.category}</span>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{r.title}</h4>
                          <p className="text-slate-600 dark:text-slate-300 mt-1 text-[11px]">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kotak Curhat & Lapor Kendala */}
                  <form onSubmit={handleSubmitComplaint} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      Kotak Pengaduan & Curhat Kendala Belajar (Aman & Rahasia)
                    </h4>
                    {complaintSubmitted && (
                      <div className="p-2.5 rounded bg-emerald-50 text-emerald-800 text-xs">
                        Laporan telah terkirim langsung ke Guru BK secara rahasia.
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={complaintCategory}
                        onChange={(e) => setComplaintCategory(e.target.value as any)}
                        className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="kendala_belajar">Kendala Materi / Tugas</option>
                        <option value="perundungan">Lapor Indikasi Bullying</option>
                        <option value="saran">Saran Kenyamanan Belajar</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={complaintText}
                      onChange={(e) => setComplaintText(e.target.value)}
                      placeholder="Tuliskan kendala belajarmu dengan aman..."
                      required
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                    >
                      Kirim Laporan Rahasia
                    </button>
                  </form>
                </div>
              )}

              {/* BANDARA: Misi Karir & Jurnal */}
              {building.id === 'bandara' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold">Misi Karir & Jurnal Eksplorasi Vokasi</h3>
                  <div className="space-y-3">
                    {INITIAL_MISSIONS.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-xl border ${
                          m.completed
                            ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80'
                        } flex items-center justify-between`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{m.title}</span>
                            {m.completed && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold">
                                Selesai
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                        </div>
                        <span className="text-xs font-bold text-amber-600 font-mono">
                          +{m.rewardPoints} Pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DEWAN KOTA: Forum Aspirasi */}
              {building.id === 'dewankota' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold">Forum Musyawarah & Capaian Sekolah</h3>
                  <p className="text-xs text-slate-500">
                    Dewan Kota memfasilitasi evaluasi pembelajaran terpadu, program kewirausahaan siswa, dan pemilihan Duta Refleksi setiap bulan.
                  </p>
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 text-xs">
                    💡 <strong>Tips Dewan:</strong> Siswa dengan refleksi paling mendalam dan bantuan aktif di obrolan Kafe akan dinominasikan sebagai Duta Refleksi Vokasi semester ini!
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
