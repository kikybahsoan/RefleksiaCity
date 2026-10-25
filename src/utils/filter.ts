/**
 * Filter kata kasar sederhana untuk obrolan santun di lingkungan SMK/SMA
 */

const PROFANITY_LIST = [
  'anjing',
  'babi',
  'bangsat',
  'kampang',
  'kontol',
  'memek',
  'pantek',
  'perek',
  'tolol',
  'goblok',
  'bajingan',
  'sialan',
  'brengsek',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'idiot',
  'bodoh sekali',
  'kafir',
];

/**
 * Filter text and replace vulgar words with asterisks
 */
export function filterProfanity(text: string): { cleanText: string; hasProfanity: boolean } {
  let hasProfanity = false;
  let cleanText = text;

  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(cleanText)) {
      hasProfanity = true;
      cleanText = cleanText.replace(regex, (match) => '*'.repeat(match.length));
    }
  }

  return { cleanText, hasProfanity };
}

/**
 * Common quick reflection phrases to inspire students
 */
export const REFLECTION_STARTERS = [
  'Hari ini saya baru menyadari bahwa...',
  'Tantangan terbesar yang saya hadapi adalah...',
  'Hal paling berharga yang saya pelajari dari materi ini:',
  'Langkah nyata yang akan saya terapkan besok di kelas:',
];
