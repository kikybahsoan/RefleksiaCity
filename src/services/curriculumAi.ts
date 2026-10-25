export interface GeneratedCurriculum {
  themeTitle: string;
  summary: string;
  perpustakaan: {
    title: string;
    content: string;
    reflectionPrompt: string;
    points: number;
  };
  dewankota: {
    title: string;
    caseStudy: string;
    governanceQuestion: string;
  };
  menara: {
    title: string;
    announcementText: string;
    broadcastTask: string;
  };
  polisi: {
    title: string;
    rulesAgreed: string[];
    safetyGuidelines: string;
  };
  kafe: {
    title: string;
    discussionStarter: string;
    icebreaker: string;
  };
  toko: {
    title: string;
    quizItems: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      rewardPoints: number;
    }>;
  };
  bandara: {
    missionName: string;
    missionBrief: string;
    steps: string[];
    rewardPoints: number;
  };
  alunalun: {
    treePrompt: string;
    quote: string;
  };
}

export async function generateCurriculumWithAi(params: {
  elemen: string;
  tujuanPembelajaran: string;
  materiEsensial: string;
  targetKelas?: string;
  tenggatWaktu?: string;
}): Promise<{ curriculum: GeneratedCurriculum; source: 'ai' | 'fallback' }> {
  try {
    const res = await fetch('/api/generate-curriculum', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data) {
        return { curriculum: result.data, source: 'ai' };
      }
    }
  } catch {
    // Network or static GitHub Pages environment; proceed to fallback
  }

  // Intelligent pedagogical fallback generator (works 100% offline and on static GitHub Pages)
  const { elemen, tujuanPembelajaran, materiEsensial } = params;
  const targetKelas = params.targetKelas || 'Kelas XII';

  const fallback: GeneratedCurriculum = {
    themeTitle: `Modul Terpadu: ${elemen}`,
    summary: `Kurikulum pembelajaran vokasi "${elemen}" didistribusikan ke 8 bangunan Kota Refleksia untuk memadukan penguasaan konsep, etika industri, portofolio riil, dan refleksi mendalam.`,
    perpustakaan: {
      title: `Eksplorasi Konsep: ${materiEsensial}`,
      content: `### Capaian Pembelajaran: ${elemen}\n\n**Tujuan Pembelajaran:**\n${tujuanPembelajaran}\n\n**Materi Esensial:**\n${materiEsensial}\n\nDalam pembelajaran vokasi modern, pemahaman fondasional mengenai ${materiEsensial} menjadi landasan utama sebelum mengimplementasikannya pada skala industri. Pelajari konsep ini secara analitis dan temukan korelasi dengan proyek yang sedang Anda kerjakan.`,
      reflectionPrompt: `Berdasarkan pemahamanmu tentang ${materiEsensial}, apa tantangan teknis terbesar yang kamu antisipasi dan bagaimana rencanamu mengatasinya?`,
      points: 25,
    },
    dewankota: {
      title: `Standar Industri & Etika: ${elemen}`,
      caseStudy: `Sebuah perusahaan teknologi terkemuka menerapkan ${materiEsensial} pada sistem inti mereka. Sebagai tim pengembang, Anda dihadapkan pada pilihan antara merilis produk lebih cepat dengan memangkas pengujian atau memastikan kepatuhan standar kualitas dan keamanan data pengguna.`,
      governanceQuestion: `Bagaimana Anda menyelaraskan efisiensi kerja dengan tanggung jawab etika profesi saat mengimplementasikan ${materiEsensial}?`,
    },
    menara: {
      title: `Siaran Edukasi: Tantangan ${elemen}`,
      announcementText: `📢 PENGUMUMAN GURU (${targetKelas}): Modul baru tentang ${elemen} resmi dibuka di seluruh penjuru Kota Refleksia. Selesaikan misi di 8 bangunan sebelum ${params.tenggatWaktu || 'akhir pekan'}!`,
      broadcastTask: `Buatlah skrip siaran 60 detik atau infografis ringkas yang menjelaskan manfaat ${materiEsensial} kepada masyarakat umum atau adik kelasmu.`,
    },
    polisi: {
      title: `SOP & Kesepakatan Belajar: ${elemen}`,
      rulesAgreed: [
        `Komitmen menyelesaikan tugas ${materiEsensial} secara mandiri dan jujur tanpa plagiarisme.`,
        'Mendokumentasikan setiap kendala teknis atau error log sebelum berkonsultasi ke guru.',
        'Saling memberikan umpan balik konstruktif dan santun pada forum obrolan kelas.',
        'Menerapkan prinsip keamanan data (security best practice) dalam setiap pengerjaan kode/proyek.',
      ],
      safetyGuidelines: `Selalu gunakan lingkungan pengujian terisolasi saat mencoba ${materiEsensial}. Pastikan mencadangkan (backup) berkas kerja secara berkala ke repository GitHub Anda.`,
    },
    kafe: {
      title: `Kopi Santai & Diskusi: ${materiEsensial}`,
      discussionStarter: `Bagaimana pengalaman pertamamu saat mencoba memahami ${materiEsensial}? Ada konsep yang terasa membingungkan atau justru sangat menarik? Yuk diskusikan bersama teman mejamu!`,
      icebreaker: `Jika ${materiEsensial} diibaratkan alat perkakas di rumah atau kendaraan, benda apakah itu dan mengapa?`,
    },
    toko: {
      title: `Tantangan Kuis Poin: ${elemen}`,
      quizItems: [
        {
          question: `Apa fungsi utama dari penerapan ${materiEsensial} dalam lingkup ${elemen}?`,
          options: [
            `Meningkatkan efisiensi, struktur kerja, dan keandalan sistem`,
            `Hanya sekadar formalitas dokumentasi proyek`,
            `Menggantikan seluruh proses pengujian manual`,
            `Menghapus kebutuhan kolaborasi antar anggota tim`,
          ],
          correctIndex: 0,
          rewardPoints: 20,
        },
        {
          question: `Manakah sikap kerja yang paling tepat saat menghadapi kendala pada ${materiEsensial}?`,
          options: [
            `Menyerah dan menunggu jawaban dari rekan lain`,
            `Menganalisis pesan kesalahan, mengecek dokumentasi, dan berdiskusi secara konstruktif`,
            `Menghapus seluruh proyek dari awal tanpa analisis`,
            `Mengabaikan error selama program masih berjalan`,
          ],
          correctIndex: 1,
          rewardPoints: 20,
        },
        {
          question: `Bagaimana keterkaitan antara ${tujuanPembelajaran} dengan kebutuhan dunia kerja saat ini?`,
          options: [
            `Dunia industri menuntut tenaga kerja yang mampu beradaptasi dan menerapkan solusi praktis`,
            `Kebutuhan industri tidak ada hubungannya dengan capaian pembelajaran sekolah`,
            `Hanya teori hafalan yang dinilai oleh industri`,
            `Tidak memiliki dampak pada portofolio keahlian siswa`,
          ],
          correctIndex: 0,
          rewardPoints: 20,
        },
      ],
    },
    bandara: {
      missionName: `Misi Industri: Penerbangan Proyek ${materiEsensial}`,
      missionBrief: `Buktikan kompetensimu dalam ${elemen}! Bangun portofolio nyata yang siap diperiksa oleh penguji industri dan guru pembimbing.`,
      steps: [
        `Tahap 1: Analisis kebutuhan dan perancangan arsitektur untuk ${materiEsensial}.`,
        'Tahap 2: Implementasi prototipe fungsional sesuai standar industri.',
        'Tahap 3: Pengujian fungsional dan pencatatan hasil verifikasi (test cases).',
        'Tahap 4: Unggah berkas portofolio ke GitHub dan sematkan tautannya ke Bandara Refleksia.',
      ],
      rewardPoints: 50,
    },
    alunalun: {
      treePrompt: `Setelah mempelajari ${materiEsensial}, apa satu wawasan baru tentang dirimu sebagai seorang calon profesional di bidang ${elemen}?`,
      quote: `"Keahlian teknis membuka pintu kesempatan, namun refleksi yang jujur dan konsistensi belajarlah yang mengantarmu menjadi maestro."`,
    },
  };

  return { curriculum: fallback, source: 'fallback' };
}
