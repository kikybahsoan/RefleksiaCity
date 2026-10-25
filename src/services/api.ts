import {
  Building,
  Material,
  Reflection,
  Question,
  ChatMessage,
  StoreItem,
  User,
  ActivityLog,
  StickyReflection,
} from '../types';
import {
  INITIAL_BUILDINGS,
  INITIAL_MATERIALS,
  INITIAL_REFLECTIONS,
  INITIAL_QUESTIONS,
  INITIAL_CHAT,
  INITIAL_STORE_ITEMS,
  INITIAL_USERS,
  INITIAL_STICKY_NOTES,
} from './initialData';

const STORAGE_KEYS = {
  APPS_SCRIPT_URL: 'kota_refleksia_apps_script_url',
  BUILDINGS: 'kota_refleksia_buildings',
  MATERIALS: 'kota_refleksia_materials',
  REFLECTIONS: 'kota_refleksia_reflections',
  QUESTIONS: 'kota_refleksia_questions',
  CHAT: 'kota_refleksia_chat',
  USERS: 'kota_refleksia_users',
  STORE_ITEMS: 'kota_refleksia_store_items',
  ACTIVITIES: 'kota_refleksia_activities',
  STICKY: 'kota_refleksia_sticky_notes',
  CURRENT_USER: 'kota_refleksia_current_user',
};

export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxE38CCJ3JPHZX4iOQzX1AvTkRAQIKOSsbIwk8DPPM57IQc0VLfLl8d_U5a1-LP9guxnQ/exec';

export class ApiService {
  private scriptUrl: string = DEFAULT_APPS_SCRIPT_URL;

  constructor() {
    this.scriptUrl = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL;
  }

  getScriptUrl(): string {
    return this.scriptUrl;
  }

  setScriptUrl(url: string) {
    this.scriptUrl = url.trim();
    localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_URL, this.scriptUrl);
  }

  // Local Storage Helpers
  private getLocal<T>(key: string, defaultVal: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private setLocal<T>(key: string, value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage quota exceeded or error:', e);
    }
  }

  // Initialize seed data if empty
  initializeLocalData() {
    if (!localStorage.getItem(STORAGE_KEYS.BUILDINGS)) {
      this.setLocal(STORAGE_KEYS.BUILDINGS, INITIAL_BUILDINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MATERIALS)) {
      this.setLocal(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REFLECTIONS)) {
      this.setLocal(STORAGE_KEYS.REFLECTIONS, INITIAL_REFLECTIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
      this.setLocal(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHAT)) {
      this.setLocal(STORAGE_KEYS.CHAT, INITIAL_CHAT);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.setLocal(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STORE_ITEMS)) {
      this.setLocal(STORAGE_KEYS.STORE_ITEMS, INITIAL_STORE_ITEMS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STICKY)) {
      this.setLocal(STORAGE_KEYS.STICKY, INITIAL_STICKY_NOTES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
      this.setLocal(STORAGE_KEYS.ACTIVITIES, [
        {
          id: 'act_1',
          buildingId: 'perpustakaan',
          userId: 'SISWA01',
          userName: 'Andi Pratama',
          action: 'refleksi',
          description: 'Mengirim refleksi nalar kritis di Perpustakaan',
          pointsChange: 25,
          timestamp: '24 Okt 2026, 14:20',
        },
        {
          id: 'act_2',
          buildingId: 'kafe',
          userId: 'SISWA01',
          userName: 'Andi Pratama',
          action: 'kunjungan',
          description: 'Berkunjung ke Kafe Kopi Refleksi',
          pointsChange: 5,
          timestamp: '24 Okt 2026, 15:00',
        },
      ]);
    }
  }

  // Central fetch wrapper with timeout and fallback
  private async postToAppsScript<T>(payload: Record<string, unknown>): Promise<{ success: boolean; data?: T; message?: string }> {
    if (!this.scriptUrl) {
      return { success: false, message: 'APPS_SCRIPT_URL belum disetel, menggunakan penyimpanan lokal.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      // Using mode: 'cors' and text/plain to prevent preflight OPTIONS issues with Google Apps Script
      const res = await fetch(this.scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const json = await res.json();
      return json;
    } catch (err: unknown) {
      console.warn('Apps Script sync notice:', err);
      return { success: false, message: (err as Error).message || 'Koneksi gagal' };
    }
  }

  // --- Data Access Methods ---

  async getUsers(): Promise<User[]> {
    return this.getLocal<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  async checkLogin(id: string, pinHash: string): Promise<User | null> {
    const users = await this.getUsers();
    const user = users.find(u => u.id.toUpperCase() === id.trim().toUpperCase() && u.pinHash === pinHash);
    if (user) {
      this.setLocal(STORAGE_KEYS.CURRENT_USER, user);
      return user;
    }
    return null;
  }

  getCurrentUser(): User | null {
    return this.getLocal<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  setCurrentUser(user: User | null) {
    this.setLocal(STORAGE_KEYS.CURRENT_USER, user);
  }

  async getBuildings(): Promise<Building[]> {
    return this.getLocal<Building[]>(STORAGE_KEYS.BUILDINGS, INITIAL_BUILDINGS);
  }

  async getMaterials(buildingId?: string): Promise<Material[]> {
    const mats = this.getLocal<Material[]>(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
    return buildingId ? mats.filter(m => m.buildingId === buildingId) : mats;
  }

  async addMaterial(material: Omit<Material, 'id' | 'date'>): Promise<Material> {
    const mats = this.getLocal<Material[]>(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
    const newMat: Material = {
      ...material,
      id: `mat_${Date.now()}`,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
    mats.unshift(newMat);
    this.setLocal(STORAGE_KEYS.MATERIALS, mats);

    // Sync to Apps Script if configured
    this.postToAppsScript({
      action: 'add_material',
      sheet: 'Materi',
      data: newMat,
    });

    return newMat;
  }

  async getReflections(buildingId?: string): Promise<Reflection[]> {
    const refs = this.getLocal<Reflection[]>(STORAGE_KEYS.REFLECTIONS, INITIAL_REFLECTIONS);
    return buildingId ? refs.filter(r => r.buildingId === buildingId) : refs;
  }

  async submitReflection(reflection: Omit<Reflection, 'id' | 'createdAt'>): Promise<Reflection> {
    const refs = this.getLocal<Reflection[]>(STORAGE_KEYS.REFLECTIONS, INITIAL_REFLECTIONS);
    const newRef: Reflection = {
      ...reflection,
      id: `ref_${Date.now()}`,
      createdAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    refs.unshift(newRef);
    this.setLocal(STORAGE_KEYS.REFLECTIONS, refs);

    // Award points to user
    await this.updateUserPoints(reflection.studentId, reflection.pointsAwarded, `Refleksi di ${reflection.buildingId}`);

    // Log Activity
    await this.logActivity({
      buildingId: reflection.buildingId,
      userId: reflection.studentId,
      userName: reflection.studentName,
      action: 'refleksi',
      description: `Mengirim refleksi: "${reflection.keyTakeaway || reflection.answer.slice(0, 40)}..."`,
      pointsChange: reflection.pointsAwarded,
    });

    // Remote sync
    this.postToAppsScript({
      action: 'submit_reflection',
      sheet: 'Refleksi',
      data: newRef,
    });

    return newRef;
  }

  async gradeReflection(reflectionId: string, feedback: string, score: number, bonusPoints: number = 10): Promise<void> {
    const refs = this.getLocal<Reflection[]>(STORAGE_KEYS.REFLECTIONS, INITIAL_REFLECTIONS);
    const index = refs.findIndex(r => r.id === reflectionId);
    if (index !== -1) {
      refs[index].teacherFeedback = feedback;
      refs[index].feedbackScore = score;
      if (bonusPoints > 0) {
        refs[index].pointsAwarded = (refs[index].pointsAwarded || 0) + bonusPoints;
        await this.updateUserPoints(refs[index].studentId, bonusPoints, 'Bonus apresiasi refleksi dari guru');
      }
      this.setLocal(STORAGE_KEYS.REFLECTIONS, refs);

      this.postToAppsScript({
        action: 'grade_reflection',
        sheet: 'Refleksi',
        data: { id: reflectionId, feedback, score, bonusPoints },
      });
    }
  }

  async getQuestions(buildingId?: string): Promise<Question[]> {
    const questions = this.getLocal<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    return buildingId ? questions.filter(q => q.buildingId === buildingId) : questions;
  }

  async submitQuestion(question: Omit<Question, 'id' | 'createdAt' | 'status'>): Promise<Question> {
    const qs = this.getLocal<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    const newQ: Question = {
      ...question,
      id: `q_${Date.now()}`,
      status: 'menunggu',
      createdAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    qs.unshift(newQ);
    this.setLocal(STORAGE_KEYS.QUESTIONS, qs);

    await this.logActivity({
      buildingId: question.buildingId,
      userId: question.studentId,
      userName: question.studentName,
      action: 'pertanyaan',
      description: `Bertanya ke Guru: "${question.questionText.slice(0, 40)}..."`,
      pointsChange: 5,
    });

    await this.updateUserPoints(question.studentId, 5, 'Mengajukan pertanyaan kritis ke guru');

    this.postToAppsScript({
      action: 'submit_question',
      sheet: 'Pertanyaan',
      data: newQ,
    });

    return newQ;
  }

  async answerQuestion(questionId: string, answerText: string, answeredBy: string): Promise<void> {
    const qs = this.getLocal<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    const index = qs.findIndex(q => q.id === questionId);
    if (index !== -1) {
      qs[index].answerText = answerText;
      qs[index].answeredBy = answeredBy;
      qs[index].answeredAt = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      qs[index].status = 'dijawab';
      this.setLocal(STORAGE_KEYS.QUESTIONS, qs);

      this.postToAppsScript({
        action: 'answer_question',
        sheet: 'Pertanyaan',
        data: qs[index],
      });
    }
  }

  // Real-Time BroadcastChannel & Listeners
  private chatChannel: BroadcastChannel | null = typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('kota_refleksia_live_chat')
    : null;
  private chatListeners: Set<(msg: ChatMessage) => void> = new Set();

  subscribeToLiveChat(callback: (msg: ChatMessage) => void): () => void {
    this.chatListeners.add(callback);

    // Also listen to BroadcastChannel if available
    if (this.chatChannel) {
      const handleBroadcast = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NEW_CHAT') {
          callback(event.data.message);
        }
      };
      this.chatChannel.addEventListener('message', handleBroadcast);
      return () => {
        this.chatListeners.delete(callback);
        this.chatChannel?.removeEventListener('message', handleBroadcast);
      };
    }

    return () => {
      this.chatListeners.delete(callback);
    };
  }

  async getChatMessages(room: string = 'kafe'): Promise<ChatMessage[]> {
    const chat = this.getLocal<ChatMessage[]>(STORAGE_KEYS.CHAT, INITIAL_CHAT);
    return chat.filter(c => c.room === room || room === 'all');
  }

  async sendChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp' | 'reported'>): Promise<ChatMessage> {
    const chat = this.getLocal<ChatMessage[]>(STORAGE_KEYS.CHAT, INITIAL_CHAT);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newMsg: ChatMessage = {
      ...msg,
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timeStr,
      reported: false,
    };
    chat.push(newMsg);
    this.setLocal(STORAGE_KEYS.CHAT, chat);

    // Broadcast immediately to all open tabs/windows
    if (this.chatChannel) {
      this.chatChannel.postMessage({ type: 'NEW_CHAT', message: newMsg });
    }

    // Trigger local listeners
    this.chatListeners.forEach(listener => {
      try {
        listener(newMsg);
      } catch (err) {
        console.warn('Chat listener error:', err);
      }
    });

    // Remote sync to Google Apps Script
    this.postToAppsScript({
      action: 'send_chat',
      sheet: 'Obrolan',
      data: newMsg,
    });

    // Simulated responsive classmate/teacher reply if testing in single-player
    if (msg.senderRole === 'siswa') {
      const lower = msg.text.toLowerCase();
      if (lower.includes('halo') || lower.includes('hai') || lower.includes('assalamu') || lower.includes('tanya') || lower.includes('pak') || lower.includes('bu')) {
        setTimeout(() => {
          const autoReplies = [
            { senderId: 'GURU01', senderName: 'Ibu Ratna (Guru)', senderRole: 'guru' as const, text: 'Halo! Ada yang perlu didiskusikan tentang materi tugas hari ini?' },
            { senderId: 'SISWA02', senderName: 'Budi Santoso', senderRole: 'siswa' as const, text: 'Halo! Aku lagi baca modul di Perpustakaan nih.' },
            { senderId: 'SISWA03', senderName: 'Siti Rahma', senderRole: 'siswa' as const, text: 'Hai! Semangat ya belajarnya, jangan lupa cek tugas di Menara!' },
          ];
          const chosen = autoReplies[Math.floor(Math.random() * autoReplies.length)];
          const replyTime = new Date();
          const replyMsg: ChatMessage = {
            id: `chat_${Date.now()}_auto`,
            room: msg.room,
            senderId: chosen.senderId,
            senderName: chosen.senderName,
            senderRole: chosen.senderRole,
            text: chosen.text,
            timestamp: `${String(replyTime.getHours()).padStart(2, '0')}:${String(replyTime.getMinutes()).padStart(2, '0')}`,
            reported: false,
          };
          const curChat = this.getLocal<ChatMessage[]>(STORAGE_KEYS.CHAT, INITIAL_CHAT);
          curChat.push(replyMsg);
          this.setLocal(STORAGE_KEYS.CHAT, curChat);
          if (this.chatChannel) {
            this.chatChannel.postMessage({ type: 'NEW_CHAT', message: replyMsg });
          }
          this.chatListeners.forEach(l => l(replyMsg));
        }, 2200);
      }
    }

    return newMsg;
  }

  async reportChatMessage(messageId: string): Promise<void> {
    const chat = this.getLocal<ChatMessage[]>(STORAGE_KEYS.CHAT, INITIAL_CHAT);
    const msg = chat.find(c => c.id === messageId);
    if (msg) {
      msg.reported = true;
      this.setLocal(STORAGE_KEYS.CHAT, chat);
      this.postToAppsScript({
        action: 'report_chat',
        sheet: 'Obrolan',
        data: { messageId },
      });
    }
  }

  // AI Curriculum Distribution across ALL 8 Buildings
  async applyAiCurriculumToBuildings(curriculum: any): Promise<void> {
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const mats = this.getLocal<Material[]>(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);

    // 1. Perpustakaan Material
    mats.unshift({
      id: `mat_${Date.now()}_perpus`,
      buildingId: 'perpustakaan',
      title: curriculum.perpustakaan.title,
      category: 'Teori Esensial',
      excerpt: curriculum.perpustakaan.content.slice(0, 150) + '...',
      content: curriculum.perpustakaan.content,
      readTime: '7 menit',
      pointsReward: curriculum.perpustakaan.points || 25,
      author: 'Tim Kurikulum (AI Generated)',
      date: dateStr,
      tags: ['Teori Esensial', 'Kurikulum Merdeka', 'Refleksi'],
    });

    // 2. Dewan Kota Material
    mats.unshift({
      id: `mat_${Date.now()}_dewan`,
      buildingId: 'dewankota',
      title: curriculum.dewankota.title,
      category: 'Etika & Kebijakan',
      excerpt: curriculum.dewankota.caseStudy.slice(0, 150) + '...',
      content: `### Studi Kasus Industri:\n${curriculum.dewankota.caseStudy}\n\n### Pertanyaan Kebijakan & Etika:\n${curriculum.dewankota.governanceQuestion}`,
      readTime: '6 menit',
      pointsReward: 20,
      author: 'Dewan Vokasi',
      date: dateStr,
      tags: ['Etika Profesi', 'Standar Industri', 'Kebijakan'],
    });

    // 3. Menara Siaran Material / Announcement
    mats.unshift({
      id: `mat_${Date.now()}_menara`,
      buildingId: 'menara',
      title: curriculum.menara.title,
      category: 'Siaran Edukasi',
      excerpt: curriculum.menara.announcementText,
      content: `### Warta Siaran Publik:\n${curriculum.menara.announcementText}\n\n### Tantangan Siaran Siswa:\n${curriculum.menara.broadcastTask}`,
      readTime: '4 menit',
      pointsReward: 15,
      author: 'Menara Siaran Edukasi',
      date: dateStr,
      tags: ['Pengumuman', 'Broadcast Edukasi', 'Podcast'],
    });

    // 4. Kantor Polisi SOP
    mats.unshift({
      id: `mat_${Date.now()}_polisi`,
      buildingId: 'polisi',
      title: curriculum.polisi.title,
      category: 'SOP & Keamanan',
      excerpt: 'Kesepakatan kelas, keamanan data, dan SOP pelaporan kendala.',
      content: `### Kesepakatan Belajar Siswa:\n${curriculum.polisi.rulesAgreed.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\n### Panduan Keamanan (Safety Guidelines):\n${curriculum.polisi.safetyGuidelines}`,
      readTime: '5 menit',
      pointsReward: 15,
      author: 'Pos Pengawasan Disiplin & SOP',
      date: dateStr,
      tags: ['Kesepakatan Belajar', 'Security Best Practice', 'SOP'],
    });

    // 5. Bandara Vokasi Mission
    mats.unshift({
      id: `mat_${Date.now()}_bandara`,
      buildingId: 'bandara',
      title: curriculum.bandara.missionName,
      category: 'Misi Vokasi Riil',
      excerpt: curriculum.bandara.missionBrief,
      content: `### Deskripsi Misi Portofolio:\n${curriculum.bandara.missionBrief}\n\n### Langkah-Langkah Pengerjaan:\n${curriculum.bandara.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n\n**Reward Poin:** +${curriculum.bandara.rewardPoints} Poin setelah diverifikasi guru.`,
      readTime: '10 menit',
      pointsReward: curriculum.bandara.rewardPoints || 50,
      author: 'Departemen Hubungan Industri & Vokasi',
      date: dateStr,
      tags: ['Misi Vokasi', 'Portofolio Industri', 'Proyek Riil'],
    });

    // 6. Kafe Discussion Prompt
    mats.unshift({
      id: `mat_${Date.now()}_kafe`,
      buildingId: 'kafe',
      title: curriculum.kafe.title,
      category: 'Diskusi Teman Sebaya',
      excerpt: curriculum.kafe.discussionStarter,
      content: `### Pemantik Diskusi Teman Sebaya:\n${curriculum.kafe.discussionStarter}\n\n### Icebreaker Santai:\n${curriculum.kafe.icebreaker}`,
      readTime: '3 menit',
      pointsReward: 10,
      author: 'Kafe Komunitas Refleksia',
      date: dateStr,
      tags: ['Diskusi Kelompok', 'Kopi Santai', 'Peer Learning'],
    });

    this.setLocal(STORAGE_KEYS.MATERIALS, mats);

    // Post broadcast chat announcing the new curriculum to all students
    await this.sendChatMessage({
      room: 'kafe',
      senderId: 'GURU01',
      senderName: 'Ibu Ratna (Guru)',
      senderRole: 'guru',
      text: `📢 ${curriculum.menara.announcementText.slice(0, 110)}... (Cek materi baru di 8 bangunan!)`,
    });

    // Also sync to Google Apps Script
    this.postToAppsScript({
      action: 'publish_curriculum',
      sheet: 'Materi',
      data: {
        themeTitle: curriculum.themeTitle,
        summary: curriculum.summary,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async getStoreItems(): Promise<StoreItem[]> {
    return this.getLocal<StoreItem[]>(STORAGE_KEYS.STORE_ITEMS, INITIAL_STORE_ITEMS);
  }

  async redeemStoreItem(userId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    const items = await this.getStoreItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return { success: false, message: 'Item tidak ditemukan' };

    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'Pengguna tidak ditemukan' };

    if (user.points < item.price) {
      return { success: false, message: `Poin tidak mencukupi! Kamu butuh ${item.price} poin (saldo: ${user.points}).` };
    }

    user.points -= item.price;
    item.stock -= 1;
    this.setLocal(STORAGE_KEYS.USERS, users);
    this.setLocal(STORAGE_KEYS.STORE_ITEMS, items);

    // Update current session user
    const curr = this.getCurrentUser();
    if (curr && curr.id === userId) {
      curr.points = user.points;
      this.setCurrentUser(curr);
    }

    await this.logActivity({
      buildingId: 'toko',
      userId,
      userName: user.name,
      action: 'tukar_poin',
      description: `Menukarkan ${item.price} poin untuk "${item.name}"`,
      pointsChange: -item.price,
    });

    this.postToAppsScript({
      action: 'redeem_item',
      sheet: 'Poin',
      data: { userId, itemId, cost: item.price },
    });

    return { success: true, message: `Berhasil menukar ${item.name}! Poin berkurang ${item.price}.` };
  }

  async getActivities(buildingId?: string): Promise<ActivityLog[]> {
    const acts = this.getLocal<ActivityLog[]>(STORAGE_KEYS.ACTIVITIES, []);
    return buildingId ? acts.filter(a => a.buildingId === buildingId) : acts;
  }

  async logActivity(act: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const acts = this.getLocal<ActivityLog[]>(STORAGE_KEYS.ACTIVITIES, []);
    const newAct: ActivityLog = {
      ...act,
      id: `act_${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    acts.unshift(newAct);
    this.setLocal(STORAGE_KEYS.ACTIVITIES, acts.slice(0, 100)); // Keep latest 100

    this.postToAppsScript({
      action: 'log_visit',
      sheet: 'Kunjungan',
      data: newAct,
    });

    return newAct;
  }

  async updateUserPoints(userId: string, pointsDelta: number, reason: string): Promise<number> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return 0;

    user.points = Math.max(0, user.points + pointsDelta);
    this.setLocal(STORAGE_KEYS.USERS, users);

    const curr = this.getCurrentUser();
    if (curr && curr.id === userId) {
      curr.points = user.points;
      this.setCurrentUser(curr);
    }

    this.postToAppsScript({
      action: 'award_points',
      sheet: 'Poin',
      data: { userId, pointsDelta, reason, newTotal: user.points },
    });

    return user.points;
  }

  async getStickyNotes(): Promise<StickyReflection[]> {
    return this.getLocal<StickyReflection[]>(STORAGE_KEYS.STICKY, INITIAL_STICKY_NOTES);
  }

  async addStickyNote(note: Omit<StickyReflection, 'id' | 'likes' | 'timestamp'>): Promise<StickyReflection> {
    const notes = this.getLocal<StickyReflection[]>(STORAGE_KEYS.STICKY, INITIAL_STICKY_NOTES);
    const newNote: StickyReflection = {
      ...note,
      id: `stk_${Date.now()}`,
      likes: 1,
      timestamp: 'Baru saja',
    };
    notes.unshift(newNote);
    this.setLocal(STORAGE_KEYS.STICKY, notes);
    return newNote;
  }

  async likeStickyNote(id: string): Promise<void> {
    const notes = this.getLocal<StickyReflection[]>(STORAGE_KEYS.STICKY, INITIAL_STICKY_NOTES);
    const n = notes.find(item => item.id === id);
    if (n) {
      n.likes += 1;
      this.setLocal(STORAGE_KEYS.STICKY, notes);
    }
  }

  // Self-contained Google Apps Script template for user setup
  getAppsScriptTemplate(): string {
    return `/**
 * Google Apps Script Web App untuk Kota Refleksia
 * Mendukung sheet: Pengguna, Bangunan, Materi, Refleksi, Pertanyaan, Obrolan, Poin, Kunjungan
 * 
 * Cara Pasang:
 * 1. Buka Google Spreadsheet baru di Google Drive
 * 2. Klik menu 'Ekstensi' > 'Apps Script'
 * 3. Hapus kode bawaan dan tempel kode ini seluruhnya
 * 4. Klik 'Deploy' (Terapkan) > 'New Deployment' (Penerapan Baru)
 * 5. Pilih tipe: 'Web App'
 * 6. Set 'Execute as': 'Me' (Saya) dan 'Who has access': 'Anyone' (Siapa saja)
 * 7. Salin URL Web App yang dihasilkan ke pengaturan Kota Refleksia
 */

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [
    { name: 'Pengguna', headers: ['ID', 'Nama', 'Peran', 'PIN_Hash', 'Poin', 'Kelas', 'Online'] },
    { name: 'Bangunan', headers: ['ID', 'Nama', 'Kategori', 'Deskripsi', 'Jumlah_Kunjungan'] },
    { name: 'Materi', headers: ['ID', 'ID_Bangunan', 'Judul', 'Kategori', 'Konten', 'Poin_Reward', 'Penulis', 'Tanggal'] },
    { name: 'Refleksi', headers: ['ID', 'ID_Bangunan', 'ID_Siswa', 'Nama_Siswa', 'Pertanyaan', 'Jawaban', 'Pemahaman', 'Poin', 'Umpan_Balik_Guru', 'Nilai', 'Waktu'] },
    { name: 'Pertanyaan', headers: ['ID', 'ID_Bangunan', 'ID_Siswa', 'Nama_Siswa', 'Teks_Pertanyaan', 'Jawaban_Guru', 'Dijawab_Oleh', 'Waktu'] },
    { name: 'Obrolan', headers: ['ID', 'Ruang', 'ID_Pengirim', 'Nama_Pengirim', 'Peran', 'Pesan', 'Dilaporkan', 'Waktu'] },
    { name: 'Poin', headers: ['ID_Pengguna', 'Perubahan_Poin', 'Alasan', 'Total_Baru', 'Waktu'] },
    { name: 'Kunjungan', headers: ['ID', 'ID_Bangunan', 'ID_Pengguna', 'Nama_Pengguna', 'Aksi', 'Keterangan', 'Waktu'] }
  ];

  sheets.forEach(function(s) {
    var sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
      sheet.getRange(1, 1, 1, s.headers.length).setFontWeight('bold').setBackground('#E2E8F0');
    }
  });

  return 'Setup Spreadsheet Berhasil!';
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var sheetName = contents.sheet;
    var data = contents.data;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      setupSpreadsheet();
      sheet = ss.getSheetByName(sheetName);
    }

    if (action === 'submit_reflection') {
      sheet.appendRow([
        data.id, data.buildingId, data.studentId, data.studentName,
        data.promptQuestion, data.answer, data.understandingLevel,
        data.pointsAwarded, data.teacherFeedback || '', data.feedbackScore || '', data.createdAt
      ]);
    } else if (action === 'send_chat') {
      sheet.appendRow([
        data.id, data.room, data.senderId, data.senderName, data.senderRole,
        data.text, data.reported ? 'TRUE' : 'FALSE', data.timestamp
      ]);
    } else if (action === 'submit_question') {
      sheet.appendRow([
        data.id, data.buildingId, data.studentId, data.studentName,
        data.questionText, data.answerText || '', data.answeredBy || '', data.createdAt
      ]);
    } else if (action === 'log_visit') {
      sheet.appendRow([
        data.id, data.buildingId, data.userId, data.userName,
        data.action, data.description, data.timestamp
      ]);
    } else if (action === 'award_points') {
      sheet.appendRow([
        data.userId, data.pointsDelta, data.reason, data.newTotal, new Date().toISOString()
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Data berhasil disimpan ke Google Sheets' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', app: 'Kota Refleksia API' }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
  }
}

export const api = new ApiService();
api.initializeLocalData();
