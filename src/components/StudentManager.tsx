import React, { useState } from 'react';
import { Student, LearningMaterial } from '../types';
import { formatWhatsAppPhone, getWhatsAppLink } from '../utils';
import { Search, Plus, UserPlus, Phone, Calendar, BookOpen, Trash2, Edit2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  materials: LearningMaterial[];
  onAddStudent: (data: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  theme?: string;
}

export function StudentManager({ 
  students, 
  materials = [],
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent,
  theme = 'dark'
}: StudentManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [keterangan, setKeterangan] = useState('');

  const levels = materials && materials.length > 0 
    ? materials.map(m => m.level)
    : [
        'Level 1: Dasar Satuan (0 - 9)',
        'Level 2: Teman Kecil (+/-)',
        'Level 3: Dasar Puluhan (10 - 90)',
        'Level 4: Teman Besar (+/-)',
        'Level 5: Kombinasi & Perkalian'
      ];

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setName('');
    setParentName('');
    setParentPhone('');
    setJoinDate(new Date().toISOString().slice(0, 10));
    setLevel(levels[0] || 'Level 1: Dasar Satuan (0 - 9)');
    setStatus('active');
    setKeterangan('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setParentName(student.parentName);
    setParentPhone(student.parentPhone);
    setJoinDate(student.joinDate);
    setLevel(student.level || levels[0] || 'Level 1: Dasar Satuan (0 - 9)');
    setStatus(student.status);
    setKeterangan(student.keterangan || '');
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
      level: level || levels[0] || 'Level 1: Dasar Satuan (0 - 9)',
      status,
      keterangan
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
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.parentPhone.includes(searchQuery);
    const matchesLevel = levelFilter === 'All' || student.level === levelFilter;
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    return matchesSearch && matchesLevel && matchesStatus;
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
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-750' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <option value="active" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Aktif</option>
                    <option value="inactive" className={isLight ? 'bg-white text-slate-800' : 'bg-[#020617] text-white'}>Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Level Bimbingan</label>
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
        {filteredStudents.length === 0 ? (
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
                  <th className="p-4">Level Math Fingers</th>
                  <th className="p-4">Gabung Sejak</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {filteredStudents.map((student) => {
                  const waText = `Halo Ibu/Bapak ${student.parentName}, salam kenal dari Math Fingers. Ada perkembangan les yang ingin kami infokan terkait ananda ${student.name}.`;
                  const waLink = getWhatsAppLink(student.parentPhone, waText);

                  return (
                    <tr key={student.id} className={`transition duration-150 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'}`}>
                      <td className="p-4">
                        <div className={`font-semibold text-sm sm:text-base ${isLight ? 'text-slate-800' : 'text-white'}`}>{student.name}</div>
                        <div className="text-slate-400 text-xs font-mono">ID: {student.id.slice(0, 8)}</div>
                        {student.keterangan && (
                          <div className={`text-xs mt-1 px-2 py-0.5 rounded-md border inline-block max-w-[220px] truncate ${
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                          <BookOpen size={12} />
                          {student.level}
                        </span>
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
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Profil"
                          >
                            <Edit2 size={16} />
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
    </div>
  );
}
