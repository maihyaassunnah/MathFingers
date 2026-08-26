import React, { useState } from 'react';
import { Student, StudentBehaviorAssessment, AssessmentGrade } from '../types';
import { getWhatsAppLink } from '../utils';
import { 
  Sparkles, 
  Search, 
  Calendar, 
  Trash2, 
  Send, 
  AlertCircle, 
  Edit2, 
  X, 
  ChevronDown, 
  Printer, 
  Download, 
  CheckSquare, 
  Square, 
  Database, 
  Copy, 
  Check, 
  BookOpen, 
  Smile, 
  UserCheck, 
  HelpCircle,
  FileText,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import { OfflineIndicator } from './OfflineIndicator';

interface StudentBehaviorAssessmentManagerProps {
  students: Student[];
  assessments: StudentBehaviorAssessment[];
  classes?: { id: string; name: string }[];
  onAddAssessment: (data: Omit<StudentBehaviorAssessment, 'id' | 'createdAt'>) => Promise<void>;
  onAddBatchAssessments: (items: Array<Omit<StudentBehaviorAssessment, 'id' | 'createdAt'>>) => Promise<void>;
  onDeleteAssessment: (id: string) => Promise<void>;
  onUpdateAssessment: (assessment: StudentBehaviorAssessment) => Promise<void>;
  theme?: string;
  defaultTeacherName?: string;
  activeBranch?: string;
}

export const BEHAVIOR_ASPECTS_RUBRIC = [
  {
    aspek: 'Fokus',
    indikator: 'Mampu memperhatikan materi dan penjelasan guru dengan saksama tanpa mudah terdistraksi.',
    detail: 'Menjaga pandangan dan konsentrasi saat guru menjelaskan konsep gerakan jari dan soal berhitung.'
  },
  {
    aspek: 'Partisipasi',
    indikator: 'Aktif mengikuti latihan, mencoba menjawab soal jari matika, dan berani bertanya saat belum paham.',
    detail: 'Sigap merespons latihan, antusias menggerakkan jari tangan, dan proaktif dalam sesi tanya jawab.'
  },
  {
    aspek: 'Sikap dan Keaktifan',
    indikator: 'Menunjukkan sikap tertib, antusias, sopan santun, bekerja sama, serta semangat belajar tinggi.',
    detail: 'Disiplin waktu, ramah terhadap tutor dan teman sekelas, serta memiliki motivasi belajar matematika yang ceria.'
  }
];

export const GRADE_BADGES: Record<AssessmentGrade, { label: string; color: string; bg: string; border: string; desc: string }> = {
  'A+': { label: 'A+ (Istimewa)', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', desc: 'Sangat Memuaskan & Mandiri' },
  'A':  { label: 'A (Sangat Baik)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Sangat Baik & Konsisten' },
  'B+': { label: 'B+ (Baik Sekali)', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Baik Sekali & Berkembang' },
  'B':  { label: 'B (Baik)', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', desc: 'Cukup Baik & Perlu Pembiasaan' },
  'C':  { label: 'C (Cukup)', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: 'Perlu Pendampingan Khusus' }
};

export function StudentBehaviorAssessmentManager({
  students,
  assessments,
  classes = [],
  onAddAssessment,
  onAddBatchAssessments,
  onDeleteAssessment,
  onUpdateAssessment,
  theme = 'dark',
  defaultTeacherName = 'Tutor Math Fingers',
  activeBranch = 'Pusat'
}: StudentBehaviorAssessmentManagerProps) {
  const isLight = theme === 'light';

  // Sub Tab inside Behavior Assessment
  const [activeSubTab, setActiveSubTab] = useState<'input' | 'history' | 'rubric'>('input');
  
  // SQL Modal State
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Form State - Batch Input
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState('Pertemuan Reguler - Latihan Jari Matika');
  const [teacherName, setTeacherName] = useState(defaultTeacherName);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Per student assessment state in batch
  const [studentData, setStudentData] = useState<Record<string, {
    included: boolean;
    fokus: AssessmentGrade;
    partisipasi: AssessmentGrade;
    sikapKeaktifan: AssessmentGrade;
    notes: string;
  }>>({});

  // History Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('All');
  const [historyGradeFilter, setHistoryGradeFilter] = useState<string>('All');

  // Edit Modal State
  const [editingAssessment, setEditingAssessment] = useState<StudentBehaviorAssessment | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editFokus, setEditFokus] = useState<AssessmentGrade>('A');
  const [editPartisipasi, setEditPartisipasi] = useState<AssessmentGrade>('A');
  const [editSikapKeaktifan, setEditSikapKeaktifan] = useState<AssessmentGrade>('A');
  const [editNotes, setEditNotes] = useState('');
  const [editTeacherName, setEditTeacherName] = useState('');

  // Active students
  const activeStudents = [...students].filter(s => s.status === 'active');

  const availableClasses = Array.from(
    new Set([
      ...classes.map(c => c.name),
      ...activeStudents.map(s => s.kelas).filter((k): k is string => Boolean(k && k.trim()))
    ])
  ).filter(Boolean).sort();

  const filteredStudents = activeStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
    const matchesClass = classFilter === 'All'
      ? true
      : classFilter === 'UNASSIGNED'
        ? !s.kelas
        : s.kelas === classFilter;
    return matchesSearch && matchesClass;
  });

  // Initialize student batch state
  const getOrInitStudent = (studentId: string) => {
    return studentData[studentId] || {
      included: true,
      fokus: 'A',
      partisipasi: 'A',
      sikapKeaktifan: 'A',
      notes: ''
    };
  };

  const setStudentField = (studentId: string, field: 'included' | 'fokus' | 'partisipasi' | 'sikapKeaktifan' | 'notes', value: any) => {
    setStudentData(prev => {
      const current = prev[studentId] || {
        included: true,
        fokus: 'A',
        partisipasi: 'A',
        sikapKeaktifan: 'A',
        notes: ''
      };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Quick set buttons for all visible students
  const handleSetAllGrade = (aspect: 'fokus' | 'partisipasi' | 'sikapKeaktifan', grade: AssessmentGrade) => {
    setStudentData(prev => {
      const next = { ...prev };
      filteredStudents.forEach(s => {
        const current = next[s.id] || {
          included: true,
          fokus: 'A',
          partisipasi: 'A',
          sikapKeaktifan: 'A',
          notes: ''
        };
        next[s.id] = {
          ...current,
          [aspect]: grade
        };
      });
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => studentData[s.id]?.included !== false);
    setStudentData(prev => {
      const next = { ...prev };
      filteredStudents.forEach(s => {
        const current = next[s.id] || {
          included: true,
          fokus: 'A',
          partisipasi: 'A',
          sikapKeaktifan: 'A',
          notes: ''
        };
        next[s.id] = {
          ...current,
          included: !allSelected
        };
      });
      return next;
    });
  };

  // Handle Form Submit
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentsToSave = filteredStudents.filter(s => studentData[s.id]?.included !== false);

    if (studentsToSave.length === 0) {
      alert('Pilih minimal satu siswa yang dicentang untuk menyimpan penilaian.');
      return;
    }

    setIsSubmitting(true);
    try {
      const batchItems: Array<Omit<StudentBehaviorAssessment, 'id' | 'createdAt'>> = studentsToSave.map(s => {
        const current = getOrInitStudent(s.id);
        return {
          studentId: s.id,
          studentName: s.name,
          date,
          topic: topic.trim() || 'Pertemuan Reguler',
          fokus: current.fokus,
          partisipasi: current.partisipasi,
          sikapKeaktifan: current.sikapKeaktifan,
          notes: current.notes.trim(),
          teacherName: teacherName.trim() || defaultTeacherName,
          branch: s.branch || activeBranch || 'Pusat'
        };
      });

      await onAddBatchAssessments(batchItems);
      setSaveSuccessMsg(`Berhasil menyimpan penilaian sikap & keaktifan untuk ${studentsToSave.length} siswa!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      setActiveSubTab('history');
    } catch (err: any) {
      alert('Gagal menyimpan penilaian: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // History Filter
  const filteredAssessments = assessments.filter(item => {
    const matchesSearch = item.studentName.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                          (item.topic || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                          (item.notes || '').toLowerCase().includes(historySearchQuery.toLowerCase());
    const student = students.find(s => s.id === item.studentId);
    const matchesClass = historyClassFilter === 'All' 
      ? true 
      : historyClassFilter === 'UNASSIGNED' 
        ? !student?.kelas 
        : student?.kelas === historyClassFilter;
    
    const matchesGrade = historyGradeFilter === 'All'
      ? true
      : (item.fokus === historyGradeFilter || item.partisipasi === historyGradeFilter || item.sikapKeaktifan === historyGradeFilter);

    return matchesSearch && matchesClass && matchesGrade;
  });

  // Edit Handler
  const openEditModal = (item: StudentBehaviorAssessment) => {
    setEditingAssessment(item);
    setEditDate(item.date);
    setEditTopic(item.topic || '');
    setEditFokus(item.fokus);
    setEditPartisipasi(item.partisipasi);
    setEditSikapKeaktifan(item.sikapKeaktifan);
    setEditNotes(item.notes || '');
    setEditTeacherName(item.teacherName || defaultTeacherName);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment) return;

    try {
      await onUpdateAssessment({
        ...editingAssessment,
        date: editDate,
        topic: editTopic,
        fokus: editFokus,
        partisipasi: editPartisipasi,
        sikapKeaktifan: editSikapKeaktifan,
        notes: editNotes,
        teacherName: editTeacherName
      });
      setEditingAssessment(null);
    } catch (err: any) {
      alert('Gagal memperbarui data: ' + err?.message);
    }
  };

  // WhatsApp Share Generator
  const generateWhatsAppMessage = (assessment: StudentBehaviorAssessment) => {
    const student = students.find(s => s.id === assessment.studentId);
    const parentPhone = student?.parentPhone || '';

    const text = `*LAPORAN PENILAIAN SIKAP & KEAKTIFAN SISWA*
*MATH FINGERS INDONESIA*
━━━━━━━━━━━━━━━━━━━━━
Kepada Yth. Bapak/Ibu Wali dari *${assessment.studentName}*,

Berikut laporan perkembangan sikap, fokus, dan keaktifan ananda pada pembelajaran berhitung metode Math Fingers:

📅 *Tanggal:* ${assessment.date}
📖 *Materi / Topik:* ${assessment.topic || 'Latihan Berhitung Jari'}
👨‍🏫 *Tutor Pengampu:* ${assessment.teacherName || defaultTeacherName}

*HASIL EVALUASI KARAKTER & KEAKTIFAN:*
1. 🎯 *Fokus & Konsentrasi:* *${assessment.fokus}* (${GRADE_BADGES[assessment.fokus]?.label || ''})
   _Indikator: Mampu memperhatikan materi dan penjelasan guru dengan saksama._

2. 🙋 *Partisipasi:* *${assessment.partisipasi}* (${GRADE_BADGES[assessment.partisipasi]?.label || ''})
   _Indikator: Aktif mengikuti latihan dan mencoba menjawab soal jari matika._

3. 🌟 *Sikap & Keaktifan:* *${assessment.sikapKeaktifan}* (${GRADE_BADGES[assessment.sikapKeaktifan]?.label || ''})
   _Indikator: Menunjukkan sikap tertib, antusias, sopan santun, dan semangat belajar tinggi._

${assessment.notes ? `📝 *Catatan Tutor:*
"${assessment.notes}"\n` : ''}
*Keterangan Nilai:*
- A+ = Istimewa / Sangat Memuaskan
- A = Sangat Baik
- B+ = Baik Sekali
- B = Baik
- C = Perlu Pendampingan

Terima kasih atas kerja sama dan dukungan Bapak/Ibu dalam mendampingi ananda bertumbuh menjadi generasi yang cerdas dan berkarakter mulia. ✨`;

    return getWhatsAppLink(parentPhone, text);
  };

  // SQL Script for Behavior Assessments
  const sqlScript = `-- ====================================================================
-- SCRIPT TABEL PENILAIAN SIKAP & KEAKTIFAN SISWA (MATH FINGERS)
-- ====================================================================

-- 1. Buat Tabel behavior_assessments
CREATE TABLE IF NOT EXISTS behavior_assessments (
  id TEXT PRIMARY KEY,
  "studentId" TEXT REFERENCES students(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  date TEXT NOT NULL,
  topic TEXT,
  fokus TEXT NOT NULL DEFAULT 'A',
  partisipasi TEXT NOT NULL DEFAULT 'A',
  "sikapKeaktifan" TEXT NOT NULL DEFAULT 'A',
  notes TEXT,
  "teacherName" TEXT,
  branch TEXT DEFAULT 'Pusat',
  "createdAt" BIGINT NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS) & Kebijakan Akses Penuh
ALTER TABLE behavior_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write for behavior_assessments" ON behavior_assessments;
CREATE POLICY "Allow public read-write for behavior_assessments" ON behavior_assessments FOR ALL USING (true) WITH CHECK (true);

-- 3. Tambahkan Index untuk Performa Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_behavior_student_id ON behavior_assessments("studentId");
CREATE INDEX IF NOT EXISTS idx_behavior_date ON behavior_assessments(date);
CREATE INDEX IF NOT EXISTS idx_behavior_branch ON behavior_assessments(branch);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nama Siswa', 'Tanggal', 'Materi/Topik', 'Fokus', 'Partisipasi', 'Sikap & Keaktifan', 'Catatan Guru', 'Tutor', 'Cabang'];
    const rows = filteredAssessments.map(item => [
      item.id,
      item.studentName,
      item.date,
      item.topic || '-',
      item.fokus,
      item.partisipasi,
      item.sikapKeaktifan,
      item.notes || '-',
      item.teacherName || '-',
      item.branch || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Penilaian_Sikap_Keaktifan_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Buttons */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Penilaian Sikap & Keaktifan Siswa
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                  Karakter & Antusiasme
                </span>
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Evaluasi aspek <strong>Fokus</strong>, <strong>Partisipasi</strong>, dan <strong>Sikap & Keaktifan</strong> siswa sesuai panduan standar Math Fingers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5 transition shadow-xs"
              title="Buka SQL Editor Supabase untuk membuat tabel ini"
            >
              <Database size={14} />
              <span>Salin SQL Supabase</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Download size={14} />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Printer size={14} />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('input')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'input'
                ? 'bg-emerald-500 text-white shadow-xs'
                : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>Form Input Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-emerald-500 text-white shadow-xs'
                : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <FileText size={15} />
            <span>Riwayat & Rekap ({assessments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rubric')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'rubric'
                ? 'bg-emerald-500 text-white shadow-xs'
                : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <BookOpen size={15} />
            <span>Panduan Aspek & Indikator</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SUB-TAB: PANDUAN ASPEK & INDIKATOR (SESUAI DOKUMEN FOTO USER)           */}
      {/* ========================================================================= */}
      {activeSubTab === 'rubric' && (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className={`p-6 border-b ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
            <h3 className={`text-xl font-extrabold uppercase tracking-wide ${isLight ? 'text-slate-800' : 'text-white'} flex items-center gap-2`}>
              <BookOpen size={22} className="text-emerald-500" />
              <span>PENILAIAN SIKAP & KEAKTIFAN</span>
            </h3>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Standar rubrik dan tolok ukur observasi karakter siswa selama bimbingan belajar Math Fingers.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Table of Aspects & Indicators */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={isLight ? 'bg-slate-100 text-slate-800 border-b border-slate-200' : 'bg-slate-800/60 text-slate-200 border-b border-slate-700'}>
                    <th className="py-3.5 px-5 font-bold text-sm uppercase tracking-wider w-1/4">Aspek</th>
                    <th className="py-3.5 px-5 font-bold text-sm uppercase tracking-wider">Indikator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {BEHAVIOR_ASPECTS_RUBRIC.map((item, idx) => (
                    <tr key={idx} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'}>
                      <td className="py-4 px-5 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {item.aspek}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-top">
                        <p className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          {item.indikator}
                        </p>
                        <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.detail}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Keterangan Nilai Legend (Sesuai Foto User) */}
            <div className={`p-4 rounded-xl border ${
              isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-800/40'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Smile size={18} className="text-emerald-500" />
                <h4 className={`text-sm font-extrabold ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                  Keterangan Nilai:
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(GRADE_BADGES).map(([key, badge]) => (
                  <div 
                    key={key} 
                    className={`p-3 rounded-xl border ${badge.bg} ${badge.border} flex flex-col gap-1`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-base font-black ${badge.color}`}>{key}</span>
                      <span className={`text-[10px] font-bold uppercase ${badge.color}`}>
                        {key === 'A+' ? 'Istimewa' : key === 'A' ? 'Sangat Baik' : key === 'B+' ? 'Baik Sekali' : key === 'B' ? 'Baik' : 'Cukup'}
                      </span>
                    </div>
                    <p className={`text-[11px] font-medium leading-tight ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {badge.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB: FORM INPUT PENILAIAN KELAS (BATCH / CEPAT)                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'input' && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/20'
          }`}>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-800' : 'text-white'} flex items-center gap-2`}>
                <Sparkles size={20} className="text-emerald-500" />
                <span>Panel Input Nilai Sikap & Keaktifan Kelas</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Isi topik/materi bimbingan, tanggal, dan tentukan predikat sikap masing-masing siswa di bawah ini.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('rubric')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 self-start sm:self-auto"
            >
              <HelpCircle size={14} />
              <span>Lihat Rubrik Aspek</span>
            </button>
          </div>

          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <OfflineIndicator theme={theme} className="mx-5 mt-2" />

            {/* Header Configuration: Topic, Date, Teacher */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800/60">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  Materi / Bab / Pertemuan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Penjumlahan Teman Kecil (+4, +3)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  Tanggal Observasi *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  Tutor Pengampu
                </label>
                <input
                  type="text"
                  placeholder="Nama Tutor"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Filter & Batch Actions Bar */}
            <div className="px-5 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                {/* Class Filter */}
                <div className="min-w-[170px]">
                  <CustomDropdown
                    options={[
                      { label: 'Semua Kelas', value: 'All' },
                      ...availableClasses.map(c => ({ label: c, value: c })),
                      { label: 'Belum Ada Kelas', value: 'UNASSIGNED' }
                    ]}
                    value={classFilter}
                    onChange={setClassFilter}
                    theme={theme}
                  />
                </div>
              </div>

              {/* Quick Set Tools */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <CheckSquare size={13} />
                  <span>Pilih Semua Siswa</span>
                </button>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 text-slate-500">Set Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetAllGrade('fokus', 'A+');
                      handleSetAllGrade('partisipasi', 'A+');
                      handleSetAllGrade('sikapKeaktifan', 'A+');
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30"
                  >
                    Semua A+
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetAllGrade('fokus', 'A');
                      handleSetAllGrade('partisipasi', 'A');
                      handleSetAllGrade('sikapKeaktifan', 'A');
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30"
                  >
                    Semua A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetAllGrade('fokus', 'B+');
                      handleSetAllGrade('partisipasi', 'B+');
                      handleSetAllGrade('sikapKeaktifan', 'B+');
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30"
                  >
                    Semua B+
                  </button>
                </div>
              </div>
            </div>

            {/* Students Evaluation Rows */}
            <div className="px-5 space-y-3 max-h-[600px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border border-dashed ${
                  isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
                }`}>
                  <AlertCircle size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Tidak ada siswa aktif yang cocok dengan filter.</p>
                </div>
              ) : (
                filteredStudents.map((student, idx) => {
                  const current = getOrInitStudent(student.id);
                  const isIncluded = current.included !== false;

                  return (
                    <div
                      key={student.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        !isIncluded
                          ? isLight ? 'bg-slate-50/60 border-slate-200 opacity-60' : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                          : isLight ? 'bg-white border-slate-200 shadow-xs hover:border-emerald-500/50' : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Student Info & Inclusion Checkbox */}
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <button
                            type="button"
                            onClick={() => setStudentField(student.id, 'included', !isIncluded)}
                            className="text-emerald-500 hover:text-emerald-600 transition"
                          >
                            {isIncluded ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-400" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-extrabold text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>
                                {student.name}
                              </span>
                              {student.kelas && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {student.kelas}
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              Wali: {student.parentName} • {student.level || 'Level 1'}
                            </p>
                          </div>
                        </div>

                        {/* Three Aspects Grading Pills */}
                        {isIncluded && (
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* 1. FOKUS */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                  🎯 Fokus
                                </span>
                                <span className={`text-[11px] font-extrabold ${GRADE_BADGES[current.fokus]?.color}`}>
                                  {current.fokus}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                {(['A+', 'A', 'B+', 'B', 'C'] as AssessmentGrade[]).map(grade => (
                                  <button
                                    key={grade}
                                    type="button"
                                    onClick={() => setStudentField(student.id, 'fokus', grade)}
                                    className={`flex-1 py-1 rounded-lg text-xs font-black transition ${
                                      current.fokus === grade
                                        ? `${GRADE_BADGES[grade].bg} ${GRADE_BADGES[grade].color} shadow-xs border ${GRADE_BADGES[grade].border}`
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    {grade}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 2. PARTISIPASI */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                  🙋 Partisipasi
                                </span>
                                <span className={`text-[11px] font-extrabold ${GRADE_BADGES[current.partisipasi]?.color}`}>
                                  {current.partisipasi}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                {(['A+', 'A', 'B+', 'B', 'C'] as AssessmentGrade[]).map(grade => (
                                  <button
                                    key={grade}
                                    type="button"
                                    onClick={() => setStudentField(student.id, 'partisipasi', grade)}
                                    className={`flex-1 py-1 rounded-lg text-xs font-black transition ${
                                      current.partisipasi === grade
                                        ? `${GRADE_BADGES[grade].bg} ${GRADE_BADGES[grade].color} shadow-xs border ${GRADE_BADGES[grade].border}`
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    {grade}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 3. SIKAP & KEAKTIFAN */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                  🌟 Sikap & Keaktifan
                                </span>
                                <span className={`text-[11px] font-extrabold ${GRADE_BADGES[current.sikapKeaktifan]?.color}`}>
                                  {current.sikapKeaktifan}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                {(['A+', 'A', 'B+', 'B', 'C'] as AssessmentGrade[]).map(grade => (
                                  <button
                                    key={grade}
                                    type="button"
                                    onClick={() => setStudentField(student.id, 'sikapKeaktifan', grade)}
                                    className={`flex-1 py-1 rounded-lg text-xs font-black transition ${
                                      current.sikapKeaktifan === grade
                                        ? `${GRADE_BADGES[grade].bg} ${GRADE_BADGES[grade].color} shadow-xs border ${GRADE_BADGES[grade].border}`
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    {grade}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes Input for Teacher Observation */}
                      {isIncluded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <input
                            type="text"
                            placeholder="Catatan sikap / apresiasi (contoh: 'Sangat fokus saat latihan jari, cepat memahami materi baru')"
                            value={current.notes}
                            onChange={(e) => setStudentField(student.id, 'notes', e.target.value)}
                            className={`w-full px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-800 text-slate-200'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {filteredStudents.filter(s => studentData[s.id]?.included !== false).length} dari {filteredStudents.length} siswa terpilih
              </span>

              <button
                type="submit"
                disabled={isSubmitting || filteredStudents.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Penilaian Sikap & Keaktifan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB: RIWAYAT & REKAP PENILAIAN SIKAP & KEAKTIFAN                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {/* History Search & Filters */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px] flex-1 md:flex-initial">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa, topik, catatan..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="min-w-[170px]">
                <CustomDropdown
                  options={[
                    { label: 'Semua Kelas', value: 'All' },
                    ...availableClasses.map(c => ({ label: c, value: c })),
                    { label: 'Belum Ada Kelas', value: 'UNASSIGNED' }
                  ]}
                  value={historyClassFilter}
                  onChange={setHistoryClassFilter}
                  theme={theme}
                />
              </div>

              <div className="min-w-[150px]">
                <CustomDropdown
                  options={[
                    { label: 'Semua Predikat', value: 'All' },
                    { label: 'Predikat A+', value: 'A+' },
                    { label: 'Predikat A', value: 'A' },
                    { label: 'Predikat B+', value: 'B+' },
                    { label: 'Predikat B', value: 'B' },
                    { label: 'Predikat C', value: 'C' }
                  ]}
                  value={historyGradeFilter}
                  onChange={setHistoryGradeFilter}
                  theme={theme}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('input')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition flex items-center gap-1.5 self-start md:self-auto"
            >
              <CheckCircle2 size={14} />
              <span>+ Input Baru</span>
            </button>
          </div>

          {/* Cards List / Table */}
          {filteredAssessments.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border border-dashed ${
              isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <Sparkles size={36} className="mx-auto mb-3 opacity-40 text-emerald-500" />
              <h4 className="text-base font-bold mb-1">Belum Ada Riwayat Penilaian</h4>
              <p className="text-xs max-w-md mx-auto mb-4">
                Rekam observasi fokus, partisipasi, dan sikap belajar siswa menggunakan tombol input di atas.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('input')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-xs"
              >
                Mulai Input Penilaian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredAssessments.map((item) => {
                const student = students.find(s => s.id === item.studentId);
                const waLink = generateWhatsAppMessage(item);

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isLight ? 'bg-white border-slate-200 hover:shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className={`text-base font-extrabold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                            {item.studentName}
                          </h4>
                          {student?.kelas && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {student.kelas}
                            </span>
                          )}
                          <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                            • {item.date}
                          </span>
                        </div>

                        <p className={`text-xs mt-1 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          Topik: <span className="font-bold text-slate-800 dark:text-slate-200">{item.topic || 'Latihan Berhitung'}</span> • Tutor: {item.teacherName || defaultTeacherName}
                        </p>
                      </div>

                      {/* Right: Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Fokus Badge */}
                        <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${GRADE_BADGES[item.fokus].bg} ${GRADE_BADGES[item.fokus].border}`}>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Fokus:</span>
                          <span className={`text-xs font-black ${GRADE_BADGES[item.fokus].color}`}>{item.fokus}</span>
                        </div>

                        {/* Partisipasi Badge */}
                        <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${GRADE_BADGES[item.partisipasi].bg} ${GRADE_BADGES[item.partisipasi].border}`}>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Partisipasi:</span>
                          <span className={`text-xs font-black ${GRADE_BADGES[item.partisipasi].color}`}>{item.partisipasi}</span>
                        </div>

                        {/* Sikap Badge */}
                        <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${GRADE_BADGES[item.sikapKeaktifan].bg} ${GRADE_BADGES[item.sikapKeaktifan].border}`}>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Sikap:</span>
                          <span className={`text-xs font-black ${GRADE_BADGES[item.sikapKeaktifan].color}`}>{item.sikapKeaktifan}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes & Actions Bar */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className={`text-xs italic ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {item.notes ? `"${item.notes}"` : 'Tidak ada catatan tambahan.'}
                      </p>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs flex items-center gap-1.5 transition"
                            title="Kirim Laporan Sikap ke WA Orang Tua"
                          >
                            <Send size={13} />
                            <span>Kirim WA</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className={`p-1.5 rounded-lg text-xs font-bold border transition ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="Edit Penilaian"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus riwayat penilaian sikap untuk ${item.studentName}?`)) {
                              onDeleteAssessment(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 transition"
                          title="Hapus Penilaian"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL EDIT PENILAIAN SIKAP                                             */}
      {/* ========================================================================= */}
      {editingAssessment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
            }`}>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-800' : 'text-white'} flex items-center gap-2`}>
                <Edit2 size={18} className="text-emerald-500" />
                <span>Edit Penilaian: {editingAssessment.studentName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingAssessment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Tanggal</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Tutor</label>
                  <input
                    type="text"
                    value={editTeacherName}
                    onChange={(e) => setEditTeacherName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Materi / Topik</label>
                <input
                  type="text"
                  required
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* Aspects */}
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    1. Aspek Fokus: <span className="font-extrabold text-emerald-500">{editFokus}</span>
                  </label>
                  <div className="flex gap-1">
                    {(['A+', 'A', 'B+', 'B', 'C'] as AssessmentGrade[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditFokus(g)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition ${
                          editFokus === g ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    2. Aspek Partisipasi: <span className="font-extrabold text-emerald-500">{editPartisipasi}</span>
                  </label>
                  <div className="flex gap-1">
                    {(['A+', 'A', 'B+', 'B', 'C'] as AssessmentGrade[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditPartisipasi(g)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition ${
                          editPartisipasi === g ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    3. Aspek Sikap & Keaktifan: <span className="font-extrabold text-emerald-500">{editSikapKeaktifan}</span>
                  </label>
                  <div className="flex gap-1">
                    {(['A+', 'A', 'B+', 'B', 'C'] as AssessmentGrade[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditSikapKeaktifan(g)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition ${
                          editSikapKeaktifan === g ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Catatan Observasi</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                  placeholder="Catatan perkembangan..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAssessment(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL SQL EDITOR SUPABASE                                              */}
      {/* ========================================================================= */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <Database size={20} className="text-indigo-500" />
                <div>
                  <h3 className={`text-base font-extrabold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    SQL Editor Supabase: Tabel Penilaian Sikap & Keaktifan
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Salin skrip SQL ini lalu jalankan di Supabase Dashboard → SQL Editor.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Perintah SQL DDL (`behavior_assessments`):
                </span>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    copiedSql
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-xs'
                  }`}
                >
                  {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Semua SQL'}</span>
                </button>
              </div>

              {/* Code Box */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[300px] border border-slate-800 leading-relaxed select-all">
                  {sqlScript}
                </pre>
              </div>

              {/* Instructions */}
              <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                isLight ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900' : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-300'
              }`}>
                <p className="font-extrabold flex items-center gap-1.5">
                  <Database size={14} />
                  <span>Cara Memasang ke Supabase:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-90">
                  <li>Buka <strong>Supabase Dashboard</strong> proyek Anda.</li>
                  <li>Pilih menu <strong>SQL Editor</strong> di bilah navigasi kiri.</li>
                  <li>Klik <strong>New query</strong>, lalu Paste (Tempel) skrip di atas.</li>
                  <li>Klik tombol hijau <strong>Run</strong> (atau tekan Ctrl+Enter).</li>
                  <li>Tabel <code>behavior_assessments</code> siap digunakan untuk sinkronisasi otomatis multi-perangkat!</li>
                </ol>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
