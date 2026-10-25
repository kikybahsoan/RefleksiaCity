import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API Endpoint: AI Curriculum & Task Generator across all 8 buildings
app.post('/api/generate-curriculum', async (req, res) => {
  try {
    const { elemen, tujuanPembelajaran, materiEsensial, targetKelas, tenggatWaktu } = req.body;

    if (!elemen || !tujuanPembelajaran || !materiEsensial) {
      return res.status(400).json({
        success: false,
        error: 'Parameter elemen, tujuanPembelajaran, dan materiEsensial wajib diisi.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'GEMINI_API_KEY tidak terkonfigurasi di server. Silakan gunakan generator fallback bawaan.',
        fallbackRequired: true,
      });
    }

    const prompt = `
Anda adalah pakar kurikulum pembelajaran kejuruan/vokasi (SMK/SMA) dan kurikulum merdeka Indonesia.
Tugas Anda adalah menganalisis Elemen Pembelajaran, Tujuan Pembelajaran (TP), dan Materi Esensial berikut, lalu MENDISTRIBUSIKAN tugas dan aktivitas belajar yang kontekstual, menarik, dan reflektif ke SELURUH 8 BANGUNAN di "Kota Refleksia" (kota virtual 2.5D):

INPUT GURU:
- Elemen: ${elemen}
- Tujuan Pembelajaran (TP): ${tujuanPembelajaran}
- Materi Esensial: ${materiEsensial}
- Target Kelas: ${targetKelas || 'Kelas XII'}
- Tenggat: ${tenggatWaktu || '1 Minggu'}

8 BANGUNAN KOTA REFLEKSIA & FUNGSINYA:
1. "perpustakaan" (Perpustakaan Kubah Emas): Modul teori esensial, ringkasan konsep inti, dan pertanyaan refleksi nalar kritis (format esai pendek).
2. "dewankota" (Dewan Kota Kubah Hijau): Studi kasus etika profesi, tata kelola proyek industri, dan kesepakatan standar kualitas kerja.
3. "menara" (Menara Siaran ON AIR): Tantangan kampanye edukasi / broadcast (siswa membuat skrip podcast 60 detik atau infografis materi untuk warga kota).
4. "polisi" (Kantor Polisi): Kesepakatan belajar kelas (SOP), aturan kerja aman/security best practices, dan panduan pelaporan error/kendala teknis.
5. "kafe" (Kafe & Toko Roti): Pemantik diskusi santai teman sebaya (peer coffee-chat prompt) dan topik pemecahan masalah bersama.
6. "toko" (Toko Poin): 3 soal kuis pilihan ganda berhadiah poin (+20 poin per soal benar) untuk menguji pemahaman materi esensial.
7. "bandara" (Bandara Vokasi): Misi proyek vokasi nyata / sprint portofolio industri terapan dengan langkah kerja terstruktur.
8. "alunalun" (Alun-alun Refleksia): Pertanyaan refleksi filosofis/metakognitif bermakna untuk ditanam di Pohon Kebijaksanaan Refleksia.

Hasilkan respons dalam format JSON terstruktur persis sesuai skema berikut. Gunakan Bahasa Indonesia yang ramah, profesional, dan membakar semangat belajar siswa vokasi.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Anda adalah perancang kurikulum pembelajaran vokasi Indonesia yang ahli dalam Kurikulum Merdeka dan game-based learning.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themeTitle: { type: Type.STRING, description: 'Judul tematik pembelajaran yang menarik' },
            summary: { type: Type.STRING, description: 'Ringkasan keterkaitan materi ke 8 bangunan' },
            perpustakaan: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                reflectionPrompt: { type: Type.STRING },
                points: { type: Type.NUMBER },
              },
              required: ['title', 'content', 'reflectionPrompt', 'points'],
            },
            dewankota: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                caseStudy: { type: Type.STRING },
                governanceQuestion: { type: Type.STRING },
              },
              required: ['title', 'caseStudy', 'governanceQuestion'],
            },
            menara: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                announcementText: { type: Type.STRING },
                broadcastTask: { type: Type.STRING },
              },
              required: ['title', 'announcementText', 'broadcastTask'],
            },
            polisi: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                rulesAgreed: { type: Type.ARRAY, items: { type: Type.STRING } },
                safetyGuidelines: { type: Type.STRING },
              },
              required: ['title', 'rulesAgreed', 'safetyGuidelines'],
            },
            kafe: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                discussionStarter: { type: Type.STRING },
                icebreaker: { type: Type.STRING },
              },
              required: ['title', 'discussionStarter', 'icebreaker'],
            },
            toko: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                quizItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctIndex: { type: Type.NUMBER },
                      rewardPoints: { type: Type.NUMBER },
                    },
                    required: ['question', 'options', 'correctIndex', 'rewardPoints'],
                  },
                },
              },
              required: ['title', 'quizItems'],
            },
            bandara: {
              type: Type.OBJECT,
              properties: {
                missionName: { type: Type.STRING },
                missionBrief: { type: Type.STRING },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                rewardPoints: { type: Type.NUMBER },
              },
              required: ['missionName', 'missionBrief', 'steps', 'rewardPoints'],
            },
            alunalun: {
              type: Type.OBJECT,
              properties: {
                treePrompt: { type: Type.STRING },
                quote: { type: Type.STRING },
              },
              required: ['treePrompt', 'quote'],
            },
          },
          required: ['themeTitle', 'summary', 'perpustakaan', 'dewankota', 'menara', 'polisi', 'kafe', 'toko', 'bandara', 'alunalun'],
        },
      },
    });

    const outputJson = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      data: outputJson,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini Curriculum Generation Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal memproses kurikulum dengan AI.',
      fallbackRequired: true,
    });
  }
});

// Setup development server with Vite middleware or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Kota Refleksia Server running at http://localhost:${PORT}`);
  });
}

startServer();
