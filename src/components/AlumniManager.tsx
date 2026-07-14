import { useState, FormEvent } from 'react';
import { Student } from '../types';
import { Search, GraduationCap, RefreshCw, Trash2, Edit3, Award, Calendar, Phone, MapPin, ShieldAlert } from 'lucide-react';
import { getStudentUniqueCode } from '../utils';

interface AlumniManagerProps {
  students: Student[];
  onUpdateStudent: (id: string, updatedStudent: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  theme?: string;
}

export function AlumniManager({
  students,
  onUpdateStudent,
  onDeleteStudent,
  theme = 'dark'
}: AlumniManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [viewingCertificateStudent, setViewingCertificateStudent] = useState<Student | null>(null);
  
  // Edit Form States
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [editAlamat, setEditAlamat] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');

  const isLight = theme === 'light';

  // Filter only students with status 'alumni'
  const alumniList = students.filter(s => s.status === 'alumni');

  // Filter by search query, level, and gender
  const filteredAlumni = alumniList.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.alamat || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = levelFilter === 'All' || student.level === levelFilter;
    const matchesGender = genderFilter === 'All' || student.jenisKelamin === genderFilter;

    return matchesSearch && matchesLevel && matchesGender;
  });

  // Extract unique levels of alumni
  const uniqueLevels = Array.from(new Set(alumniList.map(s => s.level)));

  // Handle Edit Action
  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditParentName(student.parentName);
    setEditParentPhone(student.parentPhone);
    setEditLevel(student.level);
    setEditJenisKelamin(student.jenisKelamin || 'Laki-laki');
    setEditAlamat(student.alamat || '');
    setEditKeterangan(student.keterangan || '');
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      await onUpdateStudent(editingStudent.id, {
        name: editName,
        parentName: editParentName,
        parentPhone: editParentPhone,
        level: editLevel,
        jenisKelamin: editJenisKelamin,
        alamat: editAlamat,
        keterangan: editKeterangan
      });
      setEditingStudent(null);
    } catch (err) {
      console.error('Gagal memperbarui data alumni:', err);
    }
  };

  // Reactivate student status to active
  const handleReactivate = async (student: Student) => {
    if (confirm(`Apakah Anda yakin ingin memulihkan status ${student.name} menjadi Siswa Aktif kembali?`)) {
      try {
        await onUpdateStudent(student.id, { status: 'active' });
      } catch (err) {
        console.error('Gagal mengaktifkan kembali siswa:', err);
      }
    }
  };

  // Permanently delete student
  const handleDelete = async (student: Student) => {
    if (confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin menghapus data ${student.name} secara permanen dari database? Tindakan ini tidak bisa dibatalkan!`)) {
      try {
        await onDeleteStudent(student.id);
      } catch (err) {
        console.error('Gagal menghapus data:', err);
      }
    }
  };

  return (
    <div id="alumni-manager-section" className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className={`text-2xl font-bold font-sans flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
            <GraduationCap className="text-emerald-500" size={28} />
            <span>Data Alumni & Siswa Lulus</span>
          </h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>
            Daftar siswa bimbingan Math Fingers yang telah menyelesaikan program belajar / lulus.
          </p>
        </div>

        {/* Stats Summary */}
        <div className={`px-4 py-2 border rounded-2xl text-xs font-semibold flex items-center gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-slate-800 text-white'
        }`}>
          <GraduationCap className="text-amber-500" size={16} />
          <span>Total Alumni: <strong className="text-emerald-500 font-bold text-sm">{alumniList.length}</strong> Anak</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/10 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-250 dark:border-slate-800/60">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Cari nama alumni, wali, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-550 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-800' 
                : 'bg-slate-950/40 border-slate-800 text-white'
            }`}
          />
        </div>

        {/* Select Dropdowns */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All">Semua Level Kelulusan</option>
            {uniqueLevels.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All">Semua Jenis Kelamin</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      {filteredAlumni.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
          <GraduationCap size={44} className="mx-auto text-slate-650 mb-3 animate-pulse" />
          <p className="font-semibold text-slate-400">Belum ada data alumni ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">
            {alumniList.length === 0 
              ? "Anda bisa meluluskan siswa dengan mengklik tombol 'Luluskan Siswa' pada daftar Siswa." 
              : "Sesuaikan kata kunci pencarian atau filter Anda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAlumni.map((student) => (
            <div
              key={student.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition relative overflow-hidden group shadow-sm ${
                isLight 
                  ? 'bg-white border-slate-200 text-slate-800 hover:shadow-md' 
                  : 'bg-slate-900 border-slate-800 text-white hover:border-slate-700/80'
              }`}
            >
              {/* Top graduation badge */}
              <div className="absolute top-0 right-0 w-24 h-24 flex items-center justify-center transform translate-x-8 -translate-y-8 bg-amber-500/10 rounded-full group-hover:scale-110 transition duration-300">
                <GraduationCap className="text-amber-500/20 transform -translate-x-3 translate-y-3" size={40} />
              </div>

              <div className="space-y-3">
                {/* Level Title */}
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/15 text-amber-500">
                    {student.level}
                  </span>
                  {student.jenisKelamin && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      student.jenisKelamin === 'Laki-laki' 
                        ? 'bg-blue-500/10 text-blue-400' 
                        : 'bg-pink-500/10 text-pink-400'
                    }`}>
                      {student.jenisKelamin}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-extrabold text-lg tracking-tight truncate">{student.name}</h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                      #{getStudentUniqueCode(student)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/15" title="Cabang Bimbingan">
                      🏢 {student.branch || 'Pusat'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                    <span>Wali:</span>
                    <span className={isLight ? 'text-slate-650' : 'text-slate-300'}>{student.parentName}</span>
                  </p>
                </div>

                {/* Info List */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={13} className="text-emerald-500" />
                    <span>Mulai: {student.joinDate || '-'}</span>
                  </div>
                  {student.parentPhone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone size={13} className="text-emerald-500" />
                      <span>{student.parentPhone}</span>
                    </div>
                  )}
                  {student.alamat && (
                    <div className="flex items-start gap-2 text-slate-400">
                      <MapPin size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{student.alamat}</span>
                    </div>
                  )}
                </div>

                {student.keterangan && (
                  <p className="text-[11px] text-slate-500 bg-slate-950/15 p-2 rounded-xl border border-slate-800/30 italic">
                    {student.keterangan}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5 border-t border-slate-800/30 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setViewingCertificateStudent(student)}
                  className="flex-1 flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-2 px-2.5 rounded-xl transition shadow-sm"
                  title="Tampilkan Sertifikat Kelulusan"
                >
                  <Award size={13} />
                  <span>Sertifikat</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleEditClick(student)}
                  className={`p-2 rounded-xl border transition ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-350 border-slate-800/80'
                  }`}
                  title="Edit Data Alumni"
                >
                  <Edit3 size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => handleReactivate(student)}
                  className={`p-2 rounded-xl border transition ${
                    isLight 
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200/50' 
                      : 'bg-emerald-950/15 hover:bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                  }`}
                  title="Pulihkan Kembali Status Siswa Aktif"
                >
                  <RefreshCw size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(student)}
                  className={`p-2 rounded-xl border transition ${
                    isLight 
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200/50' 
                      : 'bg-rose-950/15 hover:bg-rose-950/30 text-rose-400 border-rose-500/20'
                  }`}
                  title="Hapus Alumni Permanen"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === PRINTABLE CERTIFICATE MODAL === */}
      {viewingCertificateStudent && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[95vh] text-white">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <GraduationCap className="text-amber-500" size={18} />
                <span>Sertifikat Kelulusan Math Fingers</span>
              </h3>
              <button 
                onClick={() => setViewingCertificateStudent(null)}
                className="text-slate-400 hover:text-white font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Certificate Preview Wrapper */}
            <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-slate-900/60">
              <div 
                id="printable-certificate-canvas"
                className="w-full max-w-2xl bg-white text-slate-900 aspect-[1.414/1] p-8 md:p-12 relative flex flex-col justify-between shadow-lg rounded-lg border-[10px] border-double border-amber-600 overflow-hidden"
                style={{ fontFamily: '"Georgia", serif' }}
              >
                {/* Certificate Background Accent Seal */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                  <GraduationCap size={400} className="text-slate-900" />
                </div>

                {/* Border corner decorations */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-600" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-600" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-600" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-600" />

                {/* Header */}
                <div className="text-center space-y-1">
                  <h4 className="text-amber-700 tracking-widest text-xs font-bold" style={{ fontFamily: '"Inter", sans-serif' }}>
                    YAYASAN BIMBINGAN BELAJAR MATH FINGERS
                  </h4>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-amber-950 uppercase tracking-wide">
                    SERTIFIKAT KELULUSAN
                  </h1>
                  <div className="w-24 h-0.5 bg-amber-600 mx-auto my-1.5" />
                  <p className="text-[10px] italic text-slate-500">No. MF/ALUMNI/{viewingCertificateStudent.id.slice(0, 5).toUpperCase()}</p>
                </div>

                {/* Main Body */}
                <div className="text-center space-y-4 my-4">
                  <p className="text-xs text-slate-600">Dengan bangga dan penuh apresiasi menganugerahkan sertifikat kepada:</p>
                  
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-950 underline decoration-amber-600 decoration-2 italic pr-2">
                      {viewingCertificateStudent.name}
                    </h2>
                    <p className="text-xs text-slate-450 italic mt-1">Siswa Kelompok Belajar Math Fingers</p>
                  </div>

                  <p className="text-xs max-w-lg mx-auto text-slate-700 leading-relaxed">
                    Telah dinyatakan lulus dengan predikat <strong>Sangat Baik</strong> setelah menyelesaikan bimbingan matematika berhitung cepat menggunakan metode kalkulasi jari kreatif pada:
                  </p>

                  <div className="flex justify-center gap-4 text-xs font-semibold font-sans">
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200">
                      PROGRAM: {viewingCertificateStudent.level.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200">
                      GENDER: {viewingCertificateStudent.jenisKelamin?.toUpperCase() || 'LAKI-LAKI'}
                    </span>
                  </div>
                </div>

                {/* Footer and Signatures */}
                <div className="flex justify-between items-end text-xs pt-4 border-t border-slate-100">
                  <div className="space-y-1 text-left">
                    <p className="text-slate-450 font-sans text-[10px]">TANGGAL BERGABUNG</p>
                    <p className="font-bold text-slate-800">{viewingCertificateStudent.joinDate || '2026-01-01'}</p>
                  </div>

                  {/* Mock Golden Seal */}
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-500 rounded-full border-4 border-amber-600 flex items-center justify-center text-white shadow-md select-none transform rotate-12">
                    <Award size={24} className="md:size-32" />
                  </div>

                  <div className="space-y-1 text-right">
                    <p className="text-slate-450 font-sans text-[10px]">DIREKTUR BIMBINGAN</p>
                    <p className="font-bold text-slate-950 italic">Math Fingers Admin</p>
                    <div className="w-16 h-px bg-slate-300 ml-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950">
              <span className="text-xs text-slate-400 font-medium">
                * Gunakan cetak PDF browser (Ctrl+P / Cmd+P) untuk menyimpan sertifikat.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Cetak / Simpan PDF
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCertificateStudent(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === EDIT ALUMNI OVERLAY MODAL === */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl border flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <Edit3 className="text-emerald-500" size={18} />
                <span>Ubah Data Alumni</span>
              </h3>
              <button 
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-white font-black text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">Nama Alumni *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800 font-medium' : 'bg-slate-900 border-slate-800 text-white font-medium'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">Nama Orang Tua/Wali *</label>
                  <input
                    type="text"
                    required
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">WhatsApp Wali *</label>
                  <input
                    type="text"
                    required
                    placeholder="628xxx"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">Level Kelulusan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Level 1, Level 2, dll..."
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-850' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
                  <select
                    value={editJenisKelamin}
                    onChange={(e) => setEditJenisKelamin(e.target.value as 'Laki-laki' | 'Perempuan')}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={editAlamat}
                  onChange={(e) => setEditAlamat(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1.5">Keterangan / Memo</label>
                <textarea
                  rows={2}
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-800/20">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    isLight ? 'bg-slate-150 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 text-slate-350 border-slate-800'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition"
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
