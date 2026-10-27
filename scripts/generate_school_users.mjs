import fs from 'fs';
import crypto from 'crypto';

const guruData = JSON.parse(fs.readFileSync('public/assets/aistudio/data_guru_02a2c138.json', 'utf8'));
const siswaData = JSON.parse(fs.readFileSync('public/assets/aistudio/data_siswa_cb95e760.json', 'utf8'));

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

// Pseudo-random deterministic generator based on seed string to keep passwords stable across runs
function seededRandom(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function() {
    h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const skinColors = ['#F7D0B2', '#ECC195', '#FCE7D2', '#E4A972', '#D89B62'];
const shirtColorsMale = ['#2563EB', '#059669', '#D97706', '#475569', '#7C3AED', '#DC2626', '#0284C7', '#0F766E'];
const shirtColorsFemale = ['#EC4899', '#8B5CF6', '#0D9488', '#F59E0B', '#3B82F6', '#10B981', '#E11D48', '#6366F1'];
const maleHairStyles = ['short', 'cap', 'curly'];
const femaleHairStyles = ['hijab', 'hijab', 'hijab', 'long']; // predominantly hijab in Gorontalo
const accessories = ['none', 'glasses', 'headphone', 'badge', 'none'];

const allUsers = [];

// 1. Process Teachers
guruData.data_guru.forEach((g, idx) => {
  const rng = seededRandom(g.id_guru + g.nip);
  // Random 6-char password like: dkv + 4 random digits
  const randomNum = Math.floor(1000 + rng() * 9000);
  const plainPassword = `dkv${randomNum}`;
  const pinHash = hashPin(plainPassword);

  const isFemale = g.nama.toUpperCase().includes('NURLAILA') || g.nama.toUpperCase().includes('AYUNITA');
  const avatar = {
    skinColor: skinColors[Math.floor(rng() * skinColors.length)],
    hairStyle: isFemale ? 'hijab' : maleHairStyles[Math.floor(rng() * maleHairStyles.length)],
    hairColor: isFemale ? '#0F766E' : '#1F2937',
    shirtColor: isFemale ? shirtColorsFemale[Math.floor(rng() * shirtColorsFemale.length)] : shirtColorsMale[Math.floor(rng() * shirtColorsMale.length)],
    accessory: isFemale ? 'glasses' : accessories[Math.floor(rng() * accessories.length)],
  };

  allUsers.push({
    id: g.id_guru,
    name: g.nama,
    role: 'guru',
    pinHash,
    plainPassword,
    nip: g.nip,
    gender: isFemale ? 'P' : 'L',
    points: 1000 + Math.floor(rng() * 500),
    className: g.tugas_tambahan || 'Guru Produktif DKV',
    additionalDuty: g.tugas_tambahan,
    online: idx < 3,
    position: {
      x: 3 + Math.floor(rng() * 6),
      y: 3 + Math.floor(rng() * 6),
    },
    avatar,
  });
});

// 2. Process Students
let studentCounter = 1;
const classEntries = Object.entries(siswaData.data_siswa_per_kelas);

for (const [rombel, students] of classEntries) {
  students.forEach((s) => {
    const studentId = `SISWA_${s.nisn}`;
    const rng = seededRandom(s.nisn + s.nama);
    const randomNum = Math.floor(1000 + rng() * 9000);
    const plainPassword = `dkv${randomNum}`;
    const pinHash = hashPin(plainPassword);

    const isFemale = s.jk === 'P';
    const avatar = {
      skinColor: skinColors[Math.floor(rng() * skinColors.length)],
      hairStyle: isFemale
        ? femaleHairStyles[Math.floor(rng() * femaleHairStyles.length)]
        : maleHairStyles[Math.floor(rng() * maleHairStyles.length)],
      hairColor: isFemale ? '#374151' : '#1F2937',
      shirtColor: isFemale
        ? shirtColorsFemale[Math.floor(rng() * shirtColorsFemale.length)]
        : shirtColorsMale[Math.floor(rng() * shirtColorsMale.length)],
      accessory: accessories[Math.floor(rng() * accessories.length)],
    };

    allUsers.push({
      id: studentId,
      name: s.nama,
      role: 'siswa',
      pinHash,
      plainPassword,
      nisn: s.nisn,
      gender: s.jk,
      points: 150 + Math.floor(rng() * 320),
      className: rombel,
      online: studentCounter <= 15,
      position: {
        x: 2 + Math.floor(rng() * 8),
        y: 2 + Math.floor(rng() * 8),
      },
      avatar,
    });
    studentCounter++;
  });
}

// Write to src/data/schoolUsers.ts
const fileHeader = `// Generated School Users for SMK Negeri 2 Gorontalo - Desain Komunikasi Visual (DKV)
// 8 Guru + 232 Siswa across 8 Rombel with random generated passwords
import { User } from '../types';

export const SCHOOL_USERS: User[] = ${JSON.stringify(allUsers, null, 2)};
`;

fs.writeFileSync('src/data/schoolUsers.ts', fileHeader, 'utf8');
console.log(`Successfully generated ${allUsers.length} users (${guruData.data_guru.length} teachers + ${studentCounter - 1} students) in src/data/schoolUsers.ts`);
