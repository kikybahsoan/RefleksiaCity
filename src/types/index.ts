export type Role = 'siswa' | 'guru';

export type BuildingId =
  | 'perpustakaan'
  | 'kafe'
  | 'alunalun'
  | 'dewankota'
  | 'menara'
  | 'polisi'
  | 'toko'
  | 'bandara';

export interface UserAvatar {
  skinColor: string;
  hairStyle: 'short' | 'long' | 'curly' | 'hijab' | 'cap';
  hairColor: string;
  shirtColor: string;
  accessory?: 'glasses' | 'headphone' | 'badge' | 'none';
}

export interface User {
  id: string; // e.g. SISWA01, GURU01
  name: string;
  role: Role;
  pinHash: string;
  points: number;
  avatar: UserAvatar;
  className?: string; // e.g. "XII RPL 1" or "Guru Produktif RPL"
  currentBuildingId?: BuildingId | null;
  online: boolean;
  position: { x: number; y: number };
  isWalking?: boolean;
  walkFrame?: number;
  facingLeft?: boolean;
}

export interface Building {
  id: BuildingId;
  name: string;
  tagline: string;
  iconName: string;
  accentColor: string;
  secondaryColor: string;
  gridX: number;
  gridY: number;
  description: string;
  roleBadgeText?: string;
  visitorCount: number;
}

export interface Material {
  id: string;
  buildingId: BuildingId;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  readTime: string;
  pointsReward: number;
  author: string;
  date: string;
  tags?: string[];
}

export interface Reflection {
  id: string;
  buildingId: BuildingId;
  studentId: string;
  studentName: string;
  promptQuestion: string;
  answer: string;
  understandingLevel: 'sangat_paham' | 'paham' | 'cukup' | 'perlu_bimbingan';
  keyTakeaway: string;
  pointsAwarded: number;
  teacherFeedback?: string;
  feedbackScore?: number;
  createdAt: string;
}

export interface Question {
  id: string;
  buildingId: BuildingId;
  studentId: string;
  studentName: string;
  questionText: string;
  answerText?: string;
  answeredBy?: string;
  answeredAt?: string;
  createdAt: string;
  status: 'menunggu' | 'dijawab';
}

export interface ActivityLog {
  id: string;
  buildingId: BuildingId;
  userId: string;
  userName: string;
  action: 'kunjungan' | 'refleksi' | 'pertanyaan' | 'tukar_poin' | 'misi';
  description: string;
  pointsChange: number;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  room: string; // 'kafe' | 'alunalun' | 'global'
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  timestamp: string;
  reported: boolean;
}

export interface StoreItem {
  id: string;
  name: string;
  category: 'avatar' | 'sekolah' | 'sertifikat';
  price: number;
  description: string;
  icon: string;
  stock: number;
  purchased?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  important: boolean;
}

export interface ClassRule {
  id: string;
  title: string;
  description: string;
  category: 'Etika Belajar' | 'Kolaborasi' | 'Integritas';
  agreedCount: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  targetBuilding: BuildingId;
  rewardPoints: number;
  completed: boolean;
}

export interface StickyReflection {
  id: string;
  author: string;
  authorRole: Role;
  text: string;
  color: string;
  likes: number;
  timestamp: string;
}
