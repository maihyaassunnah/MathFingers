import React, { useState } from 'react';
import { Student, Grade } from '../types';
import { getWhatsAppLink } from '../utils';
import { Award, Search, Calendar, Zap, Trash2, Send, AlertCircle, Edit2, X, ChevronDown, FileSpreadsheet, Printer, Download } from 'lucide-react';

interface GradeManagerProps {
  students: Student[];
  grades: Grade[];
  onAddGrade: (data: Omit<Grade, 'id'>) => Promise<void>;
  onDeleteGrade: (id: string) => Promise<void>;
  onUpdateGrade: (grade: Grade) => Promise<void>;
  theme?: string;
}

export function GradeManager({ 
  students, 
  grades, 
  onAddGrade, 
  onDeleteGrade,
  onUpdateGrade,
  theme = 'dark'
}: GradeManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'input' | 'leger'>('input');
  const [legerSearchQuery, setLegerSearchQuery] = useState('');

  // Direct Inline Class Form states
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [studentGradesData, setStudentGradesData] = useState<Record<string, { included: boolean; score: number; speedSeconds: number; notes: string }>>({});

  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editScore, setEditScore] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  const [bulkSortOrder, setBulkSortOrder] = useState<'asc' | 'desc'>('asc');

  const activeStudents = [...students]
    .filter(s => s.status === 'active')
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return bulkSortOrder === 'asc' ? cmp : -cmp;
    });

  const [bulkStudentSearchQuery, setBulkStudentSearchQuery] = useState('');
  const [bulkSelectedLetter, setBulkSelectedLetter] = useState<string>('ALL');

  const availableBulkLetters = Array.from(
    new Set(
      activeStudents
        .map(s => s.name.trim().charAt(0).toUpperCase())
        .filter(char => /[A-Z]/.test(char))
    )
  ).sort();

  const filteredBulkStudents = activeStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(bulkStudentSearchQuery.toLowerCase());
    const matchesLetter = bulkSelectedLetter === 'ALL' || s.name.trim().toUpperCase().startsWith(bulkSelectedLetter);
    return matchesSearch && matchesLetter;
  });

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
          speedSeconds: 0, // speed is omitted
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

  const handleStartEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setEditTopic(grade.topic);
    setEditDate(grade.date);
    setEditScore(grade.score);
    setEditNotes(grade.notes);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;
    if (!editTopic.trim()) {
      alert('Mohon isi Materi / Bab Uji Kompetensi!');
      return;
    }

    try {
      await onUpdateGrade({
        ...editingGrade,
        topic: editTopic,
        date: editDate,
        score: Number(editScore),
        speedSeconds: 0, // speed is omitted
        notes: editNotes
      });
      setEditingGrade(null);
      alert('Berhasil memperbarui nilai!');
    } catch (err) {
      console.error('Gagal memperbarui nilai:', err);
      alert('Terjadi kesalahan saat memperbarui nilai.');
    }
  };

  const handleDelete = async (id: string, topicName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus nilai topik "${topicName}"?`)) {
      await onDeleteGrade(id);
    }
  };

  const sendWhatsAppGrade = (grade: Grade) => {
    const student = students.find(s => s.id === grade.studentId);
    if (!student) return;

    const optionalNotes = grade.notes.trim() ? `\n\n_Catatan Guru: "${grade.notes}"_` : '';

    const message = `Halo Ibu/Bapak *${student.parentName}*,\n\nKabar gembira! 🎉 Ananda *${student.name}* baru saja menyelesaikan sesi latihan uji berhitung cepat *Math Fingers*:\n\n📚 Materi Uji: *${grade.topic}*\n🎯 Skor Akurasi: *${grade.score} / 100*${optionalNotes}\n\n_Sungguh perkembangan yang luar biasa! Mari terus semangati ananda untuk menggerakkan jarinya setiap hari agar makin terampil. Berhitung Cepat & Akurat Tanpa Alat!_ ⚡🌟\n\nSalam Hangat,\n*Tim Math Fingers*`;

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

  // --- LEGER CALCULATIONS ---
  const uniqueTopics = Array.from(new Set(grades.map(g => g.topic)));
  const topicDates = uniqueTopics.map(topic => {
    const topicGrades = grades.filter(g => g.topic === topic);
    const earliestDate = topicGrades.reduce((min, g) => g.date < min ? g.date : min, '9999-12-31');
    return { topic, date: earliestDate };
  });
  topicDates.sort((a, b) => a.date.localeCompare(b.date));
  const sortedTopics = topicDates.map(td => td.topic);

  const ledgerStudents = activeStudents.filter(s =>
    s.name.toLowerCase().includes(legerSearchQuery.toLowerCase())
  );

  let classAverageTotal = 0;
  let gradedStudentsCount = 0;
  activeStudents.forEach(student => {
    let totalScore = 0;
    let count = 0;
    sortedTopics.forEach(topic => {
      const studentGrades = grades.filter(g => g.studentId === student.id && g.topic === topic);
      if (studentGrades.length > 0) {
        const score = Math.max(...studentGrades.map(g => g.score));
        totalScore += score;
        count++;
      }
    });
    if (count > 0) {
      classAverageTotal += totalScore / count;
      gradedStudentsCount++;
    }
  });
  const classAverage = gradedStudentsCount > 0 ? (classAverageTotal / gradedStudentsCount).toFixed(1) : '0';

  const downloadLegerCSV = () => {
    const headers = ['Nama Siswa', 'Kelas', ...sortedTopics, 'Rata-rata'];
    const rows = ledgerStudents.map(student => {
      const rowData = [student.name, student.level];
      let totalScore = 0;
      let gradedCount = 0;
      
      sortedTopics.forEach(topic => {
        const studentGrades = grades.filter(g => g.studentId === student.id && g.topic === topic);
        if (studentGrades.length > 0) {
          const score = Math.max(...studentGrades.map(g => g.score));
          rowData.push(score.toString());
          totalScore += score;
          gradedCount++;
        } else {
          rowData.push('-');
        }
      });
      
      const avg = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : '-';
      rowData.push(avg);
      return rowData;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Leger_Nilai_Math_Fingers_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintLeger = () => {
    window.print();
  };

  const isLight = theme === 'light';

  return (
    <div id="grade-manager-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Input Nilai & Uji Kecepatan</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Rekam akurasi jawaban dan kecepatan berhitung (detik) siswa secara langsung di bawah ini.</p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 print:hidden">
        <button
          type="button"
          onClick={() => setViewMode('input')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-150 flex items-center gap-2 ${
            viewMode === 'input'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          <Award size={16} />
          <span>Input & Riwayat Nilai</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('leger')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-150 flex items-center gap-2 ${
            viewMode === 'leger'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-350'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Leger Nilai (Matriks)</span>
        </button>
      </div>

      {viewMode === 'input' ? (
        <>
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

          {/* Student Name Filter for Bulk Input */}
          {activeStudents.length > 0 && (
            <div className="px-5 pb-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Saring Berdasarkan Nama / Abjad</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Cari nama siswa..."
                      value={bulkStudentSearchQuery}
                      onChange={(e) => setBulkStudentSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-550 ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-slate-950/40 border-slate-800 text-white'
                      }`}
                    />
                  </div>

                  {/* Sort Dropdown Selector */}
                  <div className="relative shrink-0 min-w-[140px]">
                    <select
                      value={bulkSortOrder}
                      onChange={(e) => setBulkSortOrder(e.target.value as 'asc' | 'desc')}
                      className={`w-full pl-4 pr-10 py-2 border rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-medium transition duration-150 cursor-pointer ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 text-slate-850 hover:bg-slate-100' 
                          : 'bg-slate-950/40 border-emerald-500/80 text-emerald-400 hover:bg-slate-900'
                      }`}
                    >
                      <option value="asc">Nama: A - Z</option>
                      <option value="desc">Nama: Z - A</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-emerald-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  {(bulkStudentSearchQuery || bulkSelectedLetter !== 'ALL' || bulkSortOrder !== 'asc') && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkStudentSearchQuery('');
                        setBulkSelectedLetter('ALL');
                        setBulkSortOrder('asc');
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition shrink-0 ${
                        isLight 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Alphabet Quick Filter Bar for Grades */}
              {availableBulkLetters.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Inisial Abjad:</span>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedLetter('ALL')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition shrink-0 ${
                      bulkSelectedLetter === 'ALL'
                        ? 'bg-emerald-600 text-white'
                        : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Semua
                  </button>
                  {availableBulkLetters.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setBulkSelectedLetter(letter)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition shrink-0 ${
                        bulkSelectedLetter === letter
                          ? 'bg-emerald-600 text-white'
                          : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
                    <th className="py-2">Catatan Tambahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredBulkStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                        Tidak ada siswa yang cocok dengan pencarian "{bulkStudentSearchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredBulkStudents.map((student) => {
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
                  }))}
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
                  <th className="p-4">Tanggal</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {filteredGrades.map((grade) => {
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
                      <td className="p-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{grade.date}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(grade)}
                            className="p-2 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Nilai"
                          >
                            <Edit2 size={16} />
                          </button>
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
      </>
      ) : (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Siswa Aktif</div>
              <div className={`text-2xl font-black mt-1 ${isLight ? 'text-slate-850' : 'text-white'}`}>
                {activeStudents.length} <span className="text-xs text-slate-500 font-medium">Anak</span>
              </div>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Topik Dievaluasi</div>
              <div className={`text-2xl font-black mt-1 ${isLight ? 'text-slate-850' : 'text-white'}`}>
                {sortedTopics.length} <span className="text-xs text-slate-500 font-medium">Materi</span>
              </div>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Rata-rata Kelas</div>
              <div className="text-2xl font-black mt-1 text-emerald-500 flex items-center gap-1">
                <span>{classAverage}</span>
                <span className="text-xs text-slate-500 font-medium">/ 100</span>
              </div>
            </div>
          </div>

          {/* Leger Filter & Action Row */}
          <div className={`p-4 rounded-2xl shadow-sm border flex flex-col sm:flex-row gap-4 items-center justify-between ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          } print:hidden`}>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Cari siswa di leger..."
                value={legerSearchQuery}
                onChange={(e) => setLegerSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                }`}
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={downloadLegerCSV}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <Download size={14} />
                <span>Unduh CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrintLeger}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl border transition ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-750 hover:bg-slate-50'
                    : 'bg-slate-800 border-slate-750 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Printer size={14} />
                <span>Cetak Leger</span>
              </button>
            </div>
          </div>

          {/* Ledger Grid */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          } print:border-none print:shadow-none`}>
            {sortedTopics.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileSpreadsheet size={44} className="mx-auto text-slate-600 mb-3" />
                <p className="font-semibold text-slate-400">Belum ada data nilai</p>
                <p className="text-xs text-slate-500 mt-1">Input nilai siswa terlebih dahulu di tab "Input & Riwayat Nilai" agar leger terisi otomatis.</p>
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                {/* Print only title header */}
                <div className="hidden print:block text-center pb-4 border-b border-slate-200 mb-6">
                  <h1 className="text-xl font-extrabold text-slate-800">LEGER NILAI PRESTASI SISWA</h1>
                  <p className="text-xs text-slate-500">Bimbingan Belajar Math Fingers Berhitung Cepat Tanpa Alat</p>
                  <p className="text-[10px] text-slate-400 mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID')}</p>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xs font-bold uppercase tracking-wider ${
                      isLight ? 'bg-slate-50/80 border-slate-200 text-slate-500' : 'bg-slate-950/40 border-slate-850 text-slate-400'
                    }`}>
                      <th className={`px-4 py-3.5 font-bold sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-750' : 'bg-slate-950 border-slate-850 text-slate-200'
                      } print:bg-white print:text-slate-800`} style={{ minWidth: '150px' }}>
                        Nama Siswa
                      </th>
                      <th className="px-4 py-3.5 border-r border-slate-200 dark:border-slate-850" style={{ minWidth: '90px' }}>Kelas</th>
                      {sortedTopics.map((topic, idx) => (
                        <th key={idx} className="px-4 py-3.5 border-r border-slate-250 dark:border-slate-850 text-center font-bold text-[11px]" style={{ minWidth: '140px' }} title={topic}>
                          <div className="line-clamp-2 leading-snug">{topic}</div>
                        </th>
                      ))}
                      <th className={`px-4 py-3.5 font-bold text-center text-emerald-500 border-l ${
                        isLight ? 'bg-emerald-500/5 border-slate-200' : 'bg-emerald-950/20 border-slate-850'
                      }`} style={{ minWidth: '80px' }}>Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${
                    isLight ? 'divide-slate-100' : 'divide-slate-850/80'
                  }`}>
                    {ledgerStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3 + sortedTopics.length} className="px-4 py-8 text-center text-slate-500 italic">
                          Siswa tidak ditemukan.
                        </td>
                      </tr>
                    ) : (
                      ledgerStudents.map(student => {
                        let totalScore = 0;
                        let count = 0;
                        
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition print:bg-white">
                            {/* Sticky student name */}
                            <td className={`px-4 py-3.5 font-bold sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] border-r ${
                              isLight ? 'bg-white border-slate-200 text-slate-850' : 'bg-slate-900 border-slate-850 text-white'
                            } print:bg-white print:text-slate-800`}>
                              {student.name}
                            </td>
                            <td className="px-4 py-3.5 border-r border-slate-200 dark:border-slate-850 text-slate-400 font-medium print:text-slate-600">
                              {student.level.split(':')[0] || student.level}
                            </td>
                            
                            {/* Topic cell scores */}
                            {sortedTopics.map((topic, idx) => {
                              const studentGrades = grades.filter(g => g.studentId === student.id && g.topic === topic);
                              if (studentGrades.length > 0) {
                                const maxGrade = studentGrades.reduce((max, g) => g.score > max.score ? g : max, studentGrades[0]);
                                const score = maxGrade.score;
                                totalScore += score;
                                count++;
                                
                                let colorClass = '';
                                if (score >= 80) {
                                  colorClass = isLight 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:bg-emerald-50 print:text-emerald-800';
                                } else if (score >= 60) {
                                  colorClass = isLight 
                                    ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 print:bg-amber-50 print:text-amber-800';
                                } else {
                                  colorClass = isLight 
                                    ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 print:bg-rose-50 print:text-rose-800';
                                }
                                
                                return (
                                  <td key={idx} className="px-3 py-3 border-r border-slate-200 dark:border-slate-850 text-center">
                                    <div className={`inline-flex flex-col items-center justify-center px-2 py-1 rounded-lg border text-xs font-bold ${colorClass} min-w-[50px]`} title={`Tanggal: ${maxGrade.date}\nCatatan: ${maxGrade.notes || '-'}`}>
                                      <span>{score}</span>
                                    </div>
                                  </td>
                                );
                              } else {
                                return (
                                  <td key={idx} className="px-3 py-3 border-r border-slate-200 dark:border-slate-850 text-center text-slate-500 dark:text-slate-600">
                                    -
                                  </td>
                                );
                              }
                            })}
                            
                            {/* Average column */}
                            <td className={`px-4 py-3.5 text-center font-bold border-l ${
                              isLight ? 'bg-emerald-500/5 text-emerald-600 border-slate-200' : 'bg-emerald-950/10 text-emerald-400 border-slate-850'
                            } print:bg-slate-50 print:text-slate-900`}>
                              {count > 0 ? (totalScore / count).toFixed(1) : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Grade Modal Overlay */}
      {editingGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/20'
            }`}>
              <div className="flex items-center gap-2">
                <Award className="text-emerald-500 animate-pulse" size={20} />
                <h4 className="font-bold text-base">Edit Nilai Siswa</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingGrade(null)}
                className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nama Siswa</label>
                <input
                  type="text"
                  disabled
                  value={editingGrade.studentName}
                  className={`w-full px-3 py-2 border rounded-xl text-sm font-semibold cursor-not-allowed ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-950/60 border-slate-850 text-slate-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Materi / Bab Uji Kompetensi *</label>
                <input
                  type="text"
                  required
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Skor Akurasi (0-100) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-center font-bold ${
                      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tanggal Ujian *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Misal: Sangat fokus, mandiri"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex justify-end gap-2 shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-850'}`}>
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
