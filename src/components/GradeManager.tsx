import React, { useState } from 'react';
import { Student, Grade } from '../types';
import { getWhatsAppLink } from '../utils';
import { Award, Search, Calendar, Zap, Timer, Trash2, Send, AlertCircle } from 'lucide-react';

interface GradeManagerProps {
  students: Student[];
  grades: Grade[];
  onAddGrade: (data: Omit<Grade, 'id'>) => Promise<void>;
  onDeleteGrade: (id: string) => Promise<void>;
  theme?: string;
}

export function GradeManager({ 
  students, 
  grades, 
  onAddGrade, 
  onDeleteGrade,
  theme = 'dark'
}: GradeManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState('All');

  // Direct Inline Class Form states
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [studentGradesData, setStudentGradesData] = useState<Record<string, { included: boolean; score: number; speedSeconds: number; notes: string }>>({});

  const activeStudents = students.filter(s => s.status === 'active');

  // Initialize/sync studentGradesData whenever activeStudents changes, with default score & speedSeconds of 0
  React.useEffect(() => {
    setStudentGradesData(prev => {
      const newData: Record<string, { included: boolean; score: number; speedSeconds: number; notes: string }> = {};
      activeStudents.forEach(s => {
        newData[s.id] = prev[s.id] || {
          included: true,
          score: 0,
          speedSeconds: 0,
          notes: ''
        };
      });
      return newData;
    });
  }, [students]);

  const handleUpdateStudentBulk = (studentId: string, field: 'included' | 'score' | 'speedSeconds' | 'notes', value: any) => {
    setStudentGradesData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTopic.trim()) {
      alert('Mohon isi Materi / Bab Uji Kompetensi!');
      return;
    }

    const studentsToSave = activeStudents.filter(s => studentGradesData[s.id]?.included);
    if (studentsToSave.length === 0) {
      alert('Pilih setidaknya satu siswa untuk diinput nilai!');
      return;
    }

    try {
      // Loop and add grade for each student
      for (const student of studentsToSave) {
        const data = studentGradesData[student.id];
        if (!data) continue;
        await onAddGrade({
          studentId: student.id,
          studentName: student.name,
          date: bulkDate,
          topic: bulkTopic,
          score: Number(data.score),
          speedSeconds: Number(data.speedSeconds),
          notes: data.notes
        });
      }

      // Reset topic and data to 0
      setBulkTopic('');
      setStudentGradesData(prev => {
        const newData: Record<string, { included: boolean; score: number; speedSeconds: number; notes: string }> = {};
        activeStudents.forEach(s => {
          newData[s.id] = {
            included: true,
            score: 0,
            speedSeconds: 0,
            notes: ''
          };
        });
        return newData;
      });
      alert(`Berhasil menyimpan nilai untuk ${studentsToSave.length} siswa!`);
    } catch (err) {
      console.error('Gagal menyimpan nilai:', err);
      alert('Terjadi kesalahan saat menyimpan nilai.');
    }
  };

  // Badge calculator based on accuracy and speed
  const getAgilityBadge = (sc: number, sp: number) => {
    if (sc >= 90 && sp <= 12 && sp > 0) {
      return { text: 'Kilat Akurat ⚡🏆', style: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-550/20' };
    }
    if (sc >= 90 && (sp <= 20 || sp === 0)) {
      return { text: 'Master Akurasi 🎯', style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    }
    if (sc < 90 && sp <= 12 && sp > 0) {
      return { text: 'Kecepatan Tinggi 🏎️', style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
    }
    return { text: 'Praktisi Jari 👍', style: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
  };

  const handleDelete = async (id: string, topicName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus nilai topik "${topicName}"?`)) {
      await onDeleteGrade(id);
    }
  };

  const sendWhatsAppGrade = (grade: Grade) => {
    const student = students.find(s => s.id === grade.studentId);
    if (!student) return;

    const badge = getAgilityBadge(grade.score, grade.speedSeconds).text;
    const optionalNotes = grade.notes.trim() ? `\n\n_Catatan Guru: "${grade.notes}"_` : '';

    const message = `Halo Ibu/Bapak *${student.parentName}*,\n\nKabar gembira! 🎉 Ananda *${student.name}* baru saja menyelesaikan sesi latihan uji berhitung cepat *Math Fingers*:\n\n📚 Materi Uji: *${grade.topic}*\n🎯 Skor Akurasi: *${grade.score} / 100*\n⚡ Kecepatan Berhitung: *${grade.speedSeconds} detik*\n🏆 Lencana Kelincahan: *${badge}*${optionalNotes}\n\n_Sungguh perkembangan yang luar biasa! Mari terus semangati ananda untuk menggerakkan jarinya setiap hari agar makin terampil. Berhitung Cepat & Akurat Tanpa Alat!_ ⚡🌟\n\nSalam Hangat,\n*Tim Math Fingers*`;

    const waLink = getWhatsAppLink(student.parentPhone, message);
    window.open(waLink, '_blank', 'noreferrer');
  };

  // Filter list
  const filteredGrades = grades.filter(grade => {
    const matchesSearch = grade.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          grade.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStudent = studentFilter === 'All' || grade.studentId === studentFilter;
    return matchesSearch && matchesStudent;
  });

  const isLight = theme === 'light';

  return (
    <div id="grade-manager-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Input Nilai & Uji Kecepatan</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Rekam akurasi jawaban dan kecepatan berhitung (detik) siswa secara langsung di bawah ini.</p>
        </div>
      </div>

      {/* Direct Inline Grade Input Form */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className={`p-5 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/20'}`}>
          <h3 className={`text-base font-bold ${isLight ? 'text-slate-800' : 'text-white'} flex items-center gap-2`}>
            <Award size={20} className="text-emerald-500" />
            <span>Panel Input Nilai Kelas (Langsung)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Isi materi/bab, tanggal, dan nilai siswa aktif di bawah, lalu klik Simpan Nilai.</p>
        </div>

        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {/* Topic and Date Row */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-800/60">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Materi / Bab Uji Kompetensi *</label>
              <input
                type="text"
                required
                placeholder="Misal: Penjumlahan Kombinasi 5 (+4, +3)"
                value={bulkTopic}
                onChange={(e) => setBulkTopic(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                  isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Ujian *</label>
              <input
                type="date"
                required
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                  isLight ? 'bg-white border-slate-200 text-slate-800 font-medium' : 'bg-slate-950/40 border-slate-800 text-white'
                }`}
              />
            </div>
          </div>

          {/* Student Inputs Table */}
          <div className="p-5 overflow-x-auto">
            {activeStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle size={36} className="mx-auto text-slate-500 mb-2" />
                <p className="text-sm font-medium">Tidak ada siswa aktif kelas ini.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-450 pb-2">
                    <th className="py-2 w-16 text-center">Ikut</th>
                    <th className="py-2">Nama Siswa</th>
                    <th className="py-2 w-32 text-center">Skor (0-100)</th>
                    <th className="py-2 w-32 text-center">Durasi (Detik)</th>
                    <th className="py-2">Catatan Tambahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {activeStudents.map((student) => {
                    const data = studentGradesData[student.id] || { included: true, score: 0, speedSeconds: 0, notes: '' };
                    return (
                      <tr key={student.id} className={`transition ${data.included ? '' : 'opacity-40'}`}>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            checked={data.included}
                            onChange={(e) => handleUpdateStudentBulk(student.id, 'included', e.target.checked)}
                            className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950/40 border-slate-800 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 font-semibold text-sm">
                          <div className={isLight ? 'text-slate-800' : 'text-slate-200'}>{student.name}</div>
                          <div className="text-xs text-slate-400 font-mono">Level: {student.level}</div>
                        </td>
                        <td className="py-3 text-center px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required={data.included}
                            disabled={!data.included}
                            value={data.score}
                            onChange={(e) => handleUpdateStudentBulk(student.id, 'score', Number(e.target.value))}
                            className={`w-24 px-2 py-1.5 border rounded-lg text-center font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                            }`}
                          />
                        </td>
                        <td className="py-3 text-center px-2">
                          <input
                            type="number"
                            min="0"
                            required={data.included}
                            disabled={!data.included}
                            value={data.speedSeconds}
                            onChange={(e) => handleUpdateStudentBulk(student.id, 'speedSeconds', Number(e.target.value))}
                            className={`w-24 px-2 py-1.5 border rounded-lg text-center font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                            }`}
                          />
                        </td>
                        <td className="py-3">
                          <input
                            type="text"
                            disabled={!data.included}
                            placeholder="Sangat cepat / fokus tinggi"
                            value={data.notes}
                            onChange={(e) => handleUpdateStudentBulk(student.id, 'notes', e.target.value)}
                            className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Actions button bar */}
          {activeStudents.length > 0 && (
            <div className={`p-4 border-t flex justify-end shrink-0 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/20'}`}>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-sm"
              >
                Simpan Nilai Semua Siswa
              </button>
            </div>
          )}
        </form>
      </div>

      {/* History Section Header */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800/60">
        <h3 className={`text-lg font-bold mb-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>Riwayat Nilai & Uji Kecepatan</h3>
        <p className="text-xs text-slate-400">Gunakan pencarian dan filter di bawah untuk meninjau pencapaian belajar siswa.</p>
      </div>

      {/* Filter bar */}
      <div className={`p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 items-center ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            id="grade-search-input"
            type="text"
            placeholder="Cari materi uji atau nama siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-550 ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-800' 
                : 'bg-slate-950/40 border-slate-800 text-white'
            }`}
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            id="filter-grade-student"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-755' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Semua Siswa</option>
            {students.map(s => (
              <option key={s.id} value={s.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grades list table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {filteredGrades.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Award size={44} className="mx-auto text-slate-650 mb-3" />
            <p className="font-medium text-slate-400">Belum ada rekaman nilai bimbingan</p>
            <p className="text-xs text-slate-500 mt-1">Masukkan materi dan skor uji kompetensi pada formulir di atas untuk merekam data nilai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider text-slate-550 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <th className="p-4">Siswa</th>
                  <th className="p-4">Materi Uji</th>
                  <th className="p-4">Skor Akurasi</th>
                  <th className="p-4">Kecepatan</th>
                  <th className="p-4">Lencana Kelincahan</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {filteredGrades.map((grade) => {
                  const badge = getAgilityBadge(grade.score, grade.speedSeconds);
                  return (
                    <tr key={grade.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'}`}>
                      <td className={`p-4 font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        {grade.studentName}
                      </td>
                      <td className="p-4">
                        <div className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{grade.topic}</div>
                        {grade.notes && <div className="text-xs text-slate-500 italic">"{grade.notes}"</div>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Zap size={14} className="text-amber-500 fill-amber-500/10" />
                          <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{grade.score} / 100</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 font-mono text-slate-500 dark:text-slate-300">
                          <Timer size={14} className="text-slate-400" />
                          <span>{grade.speedSeconds} detik</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${badge.style}`}>
                          {badge.text}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{grade.date}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => sendWhatsAppGrade(grade)}
                            className="p-2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Kirim Nilai WA"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(grade.id, grade.topic)}
                            className="p-2 text-slate-500 hover:text-rose-550 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Hapus Nilai"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
