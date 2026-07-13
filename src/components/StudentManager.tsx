import React, { useState } from 'react';
import { Student, LearningMaterial, Attendance, TeacherNote, Grade } from '../types';
import { formatWhatsAppPhone, getWhatsAppLink } from '../utils';
import { generateStudentPDFReport } from '../utils/pdfGenerator';
import { Search, Plus, UserPlus, Phone, Calendar, BookOpen, Trash2, Edit2, CheckCircle, XCircle, AlertCircle, Download, Award, Video, ExternalLink, Eye, X, Image as ImageIcon, Check } from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  materials: LearningMaterial[];
  attendance: Attendance[];
  notes: TeacherNote[];
  grades: Grade[];
  onAddStudent: (data: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  theme?: string;
}

export function StudentManager({ 
  students, 
  materials = [],
  attendance = [],
  notes = [],
  grades = [],
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent,
  theme = 'dark'
}: StudentManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortAlphabetical, setSortAlphabetical] = useState<'asc' | 'desc'>('asc');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'alumni'>('active');
  const [keterangan, setKeterangan] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [jenisPaket, setJenisPaket] = useState('4P');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [alamat, setAlamat] = useState('');
  const [activeMaterialId, setActiveMaterialId] = useState('');
  const [hariLes, setHariLes] = useState('Hari Jum\'at dan Ahad');

  // Curriculum overlay modal states
  const [selectedCurriculumMat, setSelectedCurriculumMat] = useState<LearningMaterial | null>(null);
  const [selectedCurriculumFullImg, setSelectedCurriculumFullImg] = useState<string | null>(null);

  const levels = [
    'Level Dasar: Pengenalan Simbol Jari',
    'Level 1 : Penjumlahan & Pengurangan Angka Satuan',
    'Level 2 : Penjumlahan & Pengurangan Angka Puluhan',
    'Level 3 : Penjumlahan & Pengurangan Angka Ratusan',
    'Level 4 : Perkalian Dasar 1-5',
    'Level 5 : Perkalian Dasar 6-10',
    'Level 6 : Perkalian Angka Puluhan & Satuan',
    'Level 7 : Perkalian Angka Puluhan & Puluhan'
  ];

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setName('');
    setParentName('');
    setParentPhone('');
    setJoinDate(new Date().toISOString().slice(0, 10));
    setLevel(levels[0] || 'Level Dasar: Pengenalan Simbol Jari');
    setStatus('active');
    setKeterangan('');
    setTempatLahir('');
    setTanggalLahir('');
    setJenisPaket('4P');
    setJenisKelamin('Laki-laki');
    setAlamat('');
    setActiveMaterialId('');
    setHariLes('Hari Jum\'at dan Ahad');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setParentName(student.parentName);
    setParentPhone(student.parentPhone);
    setJoinDate(student.joinDate);
    setLevel(student.level || levels[0] || 'Level Dasar: Pengenalan Simbol Jari');
    setStatus(student.status);
    setKeterangan(student.keterangan || '');
    setTempatLahir(student.tempatLahir || '');
    setTanggalLahir(student.tanggalLahir || '');
    setJenisPaket(student.jenisPaket || '4P');
    setJenisKelamin(student.jenisKelamin || 'Laki-laki');
    setAlamat(student.alamat || '');
    setActiveMaterialId(student.activeMaterialId || '');
    setHariLes(student.hariLes || 'Hari Jum\'at dan Ahad');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !parentName.trim() || !parentPhone.trim()) {
      alert('Mohon lengkapi semua data wajib!');
      return;
    }

    const payload = {
      name,
      parentName,
      parentPhone,
      joinDate,
      level: level || levels[0] || 'Level Dasar: Pengenalan Simbol Jari',
      status,
      keterangan,
      tempatLahir,
      tanggalLahir,
      jenisPaket,
      jenisKelamin,
      alamat,
      activeMaterialId: activeMaterialId || '',
      hariLes
    };

    if (editingStudent) {
      await onUpdateStudent(editingStudent.id, payload);
    } else {
      await onAddStudent(payload);
    }

    setIsFormOpen(false);
    setEditingStudent(null);
  };

  const handleDelete = async (id: string, studentName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa ${studentName}?`)) {
      await onDeleteStudent(id);
    }
  };

  // Filter Logic
  const filteredStudents = students.filter(student => {
    // Exclude alumni from the current students directory
    if (student.status === 'alumni') return false;

    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.parentPhone.includes(searchQuery);
    const matchesLevel = levelFilter === 'All' || student.level === levelFilter;
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    const matchesGender = genderFilter === 'All' || student.jenisKelamin === genderFilter;
    return matchesSearch && matchesLevel && matchesStatus && matchesGender;
  });

  // Sort Logic (Alphabetical)
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortAlphabetical === 'asc') {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  const isLight = theme === 'light';

  return (
    <div id="student-manager-section" className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Database Siswa Math Fingers</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Kelola pendaftaran, level bimbingan, dan data kontak wali siswa.</p>
        </div>
        <button
          id="btn-add-student"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
        >
          <UserPlus size={18} />
          <span>Tambah Siswa Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 items-center ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            id="student-search-input"
            type="text"
            placeholder="Cari nama siswa, nama orang tua, atau nomor HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-550 ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-800' 
                : 'bg-slate-950/40 border-slate-800 text-white'
            }`}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Urutan Abjad */}
          <select
            id="sort-student-alphabetical"
            value={sortAlphabetical}
            onChange={(e) => setSortAlphabetical(e.target.value as 'asc' | 'desc')}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="asc" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Nama: A - Z</option>
            <option value="desc" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Nama: Z - A</option>
          </select>

          {/* Level Filter */}
          <select
            id="filter-student-level"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Semua Level</option>
            {levels.map(l => (
              <option key={l} value={l} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{l}</option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            id="filter-student-gender"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Semua Gender</option>
            <option value="Laki-laki" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Laki-laki</option>
            <option value="Perempuan" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Perempuan</option>
          </select>

          {/* Status Filter */}
          <select
            id="filter-student-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Semua Status</option>
            <option value="active" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Aktif</option>
            <option value="inactive" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Registration/Edit Form Overlay Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl border flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                {editingStudent ? 'Edit Profil Siswa' : 'Pendaftaran Siswa Baru'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-405 hover:text-white font-medium text-lg"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nama Siswa *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap siswa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nama Wali/Orang Tua *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Ibu/Ayah"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">WhatsApp Orang Tua *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Mulai Tanggal Bergabung *</label>
                  <input
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status Keaktifan</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'alumni')}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <option value="active" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Aktif</option>
                    <option value="inactive" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Nonaktif</option>
                    <option value="alumni" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Alumni (Lulus)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Level Bimbingan (Administratif)</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {levels.map(l => (
                    <option key={l} value={l} className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jakarta"
                    value={tempatLahir}
                    onChange={(e) => setTempatLahir(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={tanggalLahir}
                    onChange={(e) => setTanggalLahir(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Jenis Paket</label>
                  <select
                    value={jenisPaket}
                    onChange={(e) => setJenisPaket(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <option value="4P" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>4P</option>
                    <option value="8P" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>8P</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
                  <select
                    value={jenisKelamin}
                    onChange={(e) => setJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <option value="Laki-laki" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Laki-laki</option>
                    <option value="Perempuan" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pilihan Hari Les *</label>
                <select
                  value={hariLes}
                  onChange={(e) => setHariLes(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <option value="Hari Jum'at dan Ahad" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Hari Jum'at dan Ahad</option>
                  <option value="Sabtu dan Ahad" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Sabtu dan Ahad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Rumah</label>
                <textarea
                  placeholder="Masukkan alamat lengkap rumah"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-850' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Keterangan Tambahan (Opsional)</label>
                <textarea
                  placeholder="Masukkan keterangan pendaftaran siswa (misalnya preferensi jadwal les, kebutuhan khusus, dsb.)"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-850' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                />
              </div>

              <div className={`pt-4 border-t flex gap-3 justify-end ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-xl transition shadow-sm"
                >
                  Simpan Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students List Display */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {sortedStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserPlus size={44} className="mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-slate-400">Tidak ada data siswa ditemukan</p>
            <p className="text-xs text-slate-500 mt-1">Gunakan tombol tambah atau ubah filter pencarian Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Orang Tua / HP</th>
                  <th className="p-4">Level</th>
                  <th className="p-4">Materi Aktif</th>
                  <th className="p-4">Gabung Sejak</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {sortedStudents.map((student) => {
                  const waText = `Halo Ibu/Bapak ${student.parentName}, salam kenal dari Math Fingers. Ada perkembangan les yang ingin kami infokan terkait ananda ${student.name}.`;
                  const waLink = getWhatsAppLink(student.parentPhone, waText);

                  return (
                    <tr key={student.id} className={`transition duration-150 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm sm:text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</span>
                          {student.jenisKelamin && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              student.jenisKelamin === 'Laki-laki' 
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/15'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/15'
                            }`}>
                              {student.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                            </span>
                          )}
                          {student.jenisPaket && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
                              {student.jenisPaket}
                            </span>
                          )}
                          {student.hariLes && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
                              📅 {student.hariLes}
                            </span>
                          )}
                        </div>

                        {/* Lahir & Alamat Sejajar */}
                        {((student.tempatLahir || student.tanggalLahir) || student.alamat) && (
                          <div className="text-slate-400 text-xs mt-1 flex flex-wrap gap-x-2 items-center leading-relaxed">
                            {(student.tempatLahir || student.tanggalLahir) && (
                              <span>
                                <span className="opacity-70">Lahir:</span> {student.tempatLahir || '-'}{student.tanggalLahir ? `, ${student.tanggalLahir}` : ''}
                              </span>
                            )}
                            {((student.tempatLahir || student.tanggalLahir) && student.alamat) && (
                              <span className="text-slate-600 dark:text-slate-500 font-bold">•</span>
                            )}
                            {student.alamat && (
                              <span className="truncate max-w-[280px]" title={student.alamat}>
                                <span className="opacity-70">Alamat:</span> {student.alamat}
                              </span>
                            )}
                          </div>
                        )}

                        {student.keterangan && (
                          <div className={`text-xs mt-1.5 px-2 py-0.5 rounded-md border inline-block max-w-[220px] truncate ${
                            isLight 
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-700' 
                              : 'bg-amber-500/10 border-amber-500/10 text-amber-300'
                          }`} title={student.keterangan}>
                            Ket: {student.keterangan}
                          </div>
                        )}
                      </td>
                      <td className="p-4 space-y-1">
                        <div className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-305'}`}>{student.parentName}</div>
                        <a 
                          href={waLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          <Phone size={12} />
                          <span>{student.parentPhone}</span>
                        </a>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {student.level || 'Dasar'}
                        </span>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const activeMat = materials.find(m => m.id === student.activeMaterialId);
                          return (
                            <button
                              onClick={() => {
                                if (activeMat) {
                                  setSelectedCurriculumMat(activeMat);
                                } else {
                                  // Open first available material or show prompt
                                  setSelectedCurriculumMat(materials[0] || null);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                                activeMat 
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:scale-[1.02] active:scale-95 cursor-pointer hover:bg-emerald-500/25' 
                                  : 'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20 hover:text-slate-300 cursor-pointer'
                              }`}
                              title={activeMat ? 'Klik untuk melihat Gambar & Panduan Tutorial' : 'Belum ada materi aktif. Klik untuk melihat silabus pertama.'}
                            >
                              <BookOpen size={12} />
                              <span className="max-w-[150px] truncate">{activeMat ? activeMat.level : 'Pilih / Lihat Panduan'}</span>
                              {activeMat && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              )}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{student.joinDate}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {student.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                            <CheckCircle size={10} />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                            <XCircle size={10} />
                            <span>Nonaktif</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => generateStudentPDFReport(student, attendance, notes, grades)}
                            className="p-1.5 text-slate-500 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Unduh Rapor PDF"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Profil"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Apakah Anda yakin ingin meluluskan ${student.name} sebagai Alumni?`)) {
                                try {
                                  await onUpdateStudent(student.id, { status: 'alumni' });
                                  alert(`Selamat! ${student.name} berhasil diluluskan dan statusnya diubah menjadi Alumni. Data telah dipindahkan ke menu 'Alumni / Lulus'.`);
                                } catch (error) {
                                  console.error(error);
                                  alert(`Gagal meluluskan siswa: ${error instanceof Error ? error.message : 'Kesalahan tidak dikenal'}`);
                                }
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Luluskan Siswa (Jadi Alumni)"
                          >
                            <Award size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id, student.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Hapus Siswa"
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

      {/* Pop-up Modal Detail Kurikulum & Panduan Gambar */}
      {selectedCurriculumMat && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-3xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-850 text-white'
          }`}>
            {/* Header Modal */}
            <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">PANDUAN MATERI</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-400">Pilih Silabus:</span>
                    <select
                      value={selectedCurriculumMat.id}
                      onChange={(e) => {
                        const matched = materials.find(m => m.id === e.target.value);
                        if (matched) setSelectedCurriculumMat(matched);
                      }}
                      className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    >
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.level || 'Umum'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button 
                  onClick={() => setSelectedCurriculumMat(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800/10 dark:bg-slate-800 hover:bg-red-500 hover:text-white transition flex items-center justify-center text-slate-400 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Konten Modal */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Level / Tingkatan */}
              <div>
                <h3 className="text-lg font-bold text-emerald-500 mb-1">{selectedCurriculumMat.level}</h3>
              </div>

              {/* 1. Capaian Pembelajaran */}
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Capaian Pembelajaran</h5>
                <div className={`p-4 rounded-xl border-l-4 border-l-emerald-500 ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/40 border-slate-800 text-slate-300'} text-sm leading-relaxed`}>
                  {selectedCurriculumMat.capaianPembelajaran || '-'}
                </div>
              </div>

              {/* 2. Kompetensi Dasar & Materi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-150' : 'bg-slate-950/40 border-slate-800'}`}>
                  <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Kompetensi Dasar</h5>
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {selectedCurriculumMat.kompetensiDasar || '-'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-150' : 'bg-slate-950/40 border-slate-800'}`}>
                  <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Materi Pembelajaran</h5>
                  <p className={`text-xs font-semibold leading-relaxed ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {selectedCurriculumMat.materiPembelajaran || '-'}
                  </p>
                </div>
              </div>

              {/* 3. Indikator Pencapaian Kompetensi */}
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Indikator Pencapaian Kompetensi</h5>
                <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/40 border-slate-800 text-slate-300'} text-xs leading-relaxed flex gap-2`}>
                  <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{selectedCurriculumMat.indikatorPencapaian || '-'}</span>
                </div>
              </div>

              {/* Video Tutorial */}
              {selectedCurriculumMat.videoUrl && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Video size={14} />
                    <span>Video Panduan</span>
                  </h5>
                  {(() => {
                    // Quick embed URL resolver
                    const match = selectedCurriculumMat.videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                    const embedUrl = match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
                    
                    if (embedUrl) {
                      return (
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 shadow-sm relative bg-black">
                          <iframe
                            className="w-full h-full"
                            src={embedUrl}
                            title={`Video Tutorial - ${selectedCurriculumMat.title}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      );
                    } else {
                      return (
                        <a
                          href={selectedCurriculumMat.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                            theme === 'light' 
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
                              : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                              <Video size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">Buka Video Panduan Eksternal</p>
                              <p className="text-[10px] text-slate-500 truncate">{selectedCurriculumMat.videoUrl}</p>
                            </div>
                          </div>
                          <ExternalLink size={14} className="text-slate-450 flex-shrink-0" />
                        </a>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Galeri Foto Tutorial */}
              {selectedCurriculumMat.tutorialImages && selectedCurriculumMat.tutorialImages.length > 0 && (
                <div className="space-y-2.5">
                  <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-emerald-500" />
                    <span>Gambar Panduan & Ilustrasi Jari (Klik untuk Perbesar)</span>
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedCurriculumMat.tutorialImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedCurriculumFullImg(imgUrl)}
                        className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-150 hover:scale-[1.02] hover:shadow-md ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Panduan Jari ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
                          <span className="text-white text-xs font-bold flex items-center gap-1">
                            <Eye size={14} /> Perbesar
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className={`p-4 bg-slate-50 dark:bg-slate-950/40 border-t flex justify-end ${theme === 'light' ? 'border-slate-200' : 'border-slate-850'}`}>
              <button
                onClick={() => setSelectedCurriculumMat(null)}
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-sm"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {selectedCurriculumFullImg && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedCurriculumFullImg(null)}
        >
          <button 
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition text-lg"
            onClick={() => setSelectedCurriculumFullImg(null)}
          >
            ✕
          </button>
          <img 
            src={selectedCurriculumFullImg} 
            alt="Panduan Jari Perbesar" 
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
