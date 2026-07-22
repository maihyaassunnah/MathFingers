import React, { useState } from 'react';
import { ClassGroup, Student, Branch } from '../types';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Clock, 
  Calendar, 
  User, 
  Building2, 
  DoorClosed, 
  BookOpen, 
  X, 
  CheckCircle, 
  AlertCircle,
  GraduationCap,
  Layers,
  Sparkles
} from 'lucide-react';

interface ClassManagerProps {
  classes: ClassGroup[];
  students: Student[];
  branches: Branch[];
  onAddClass: (classData: Omit<ClassGroup, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateClass: (id: string, classData: Partial<ClassGroup>) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
  theme?: 'light' | 'dark';
  isSuperAdmin?: boolean;
  activeBranch?: string;
}

export function ClassManager({
  classes = [],
  students = [],
  branches = [],
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  theme = 'dark',
  isSuperAdmin = false,
  activeBranch = 'all'
}: ClassManagerProps) {
  const isLight = theme === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [viewingClassStudents, setViewingClassStudents] = useState<ClassGroup | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [scheduleDays, setScheduleDays] = useState('Senin & Rabu');
  const [scheduleTime, setScheduleTime] = useState('14:00 - 15:30');
  const [teacherName, setTeacherName] = useState('');
  const [quota, setQuota] = useState<number>(12);
  const [room, setRoom] = useState('Ruang A1');
  const [level, setLevel] = useState('Level 1 : Penjumlahan & Pengurangan Angka Satuan');
  const [branch, setBranch] = useState(() => branches[0]?.name || 'Pusat');

  const levelsList = [
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
    setEditingClass(null);
    setName('');
    setScheduleDays('Senin & Rabu');
    setScheduleTime('14:00 - 15:30');
    setTeacherName('');
    setQuota(12);
    setRoom('Ruang A1');
    setLevel(levelsList[1]);
    setBranch(activeBranch !== 'all' ? activeBranch : (branches[0]?.name || 'Pusat'));
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cls: ClassGroup) => {
    setEditingClass(cls);
    setName(cls.name);
    setScheduleDays(cls.scheduleDays || 'Senin & Rabu');
    setScheduleTime(cls.scheduleTime || '14:00 - 15:30');
    setTeacherName(cls.teacherName || '');
    setQuota(cls.quota || 12);
    setRoom(cls.room || 'Ruang A1');
    setLevel(cls.level || levelsList[1]);
    setBranch(cls.branch || 'Pusat');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Mohon isi nama kelas!');
      return;
    }

    const payload = {
      name: name.trim(),
      scheduleDays,
      scheduleTime,
      teacherName: teacherName.trim(),
      quota: Number(quota) || 12,
      room: room.trim(),
      level,
      branch
    };

    if (editingClass) {
      await onUpdateClass(editingClass.id, payload);
    } else {
      await onAddClass(payload);
    }

    setIsFormOpen(false);
    setEditingClass(null);
  };

  const handleDelete = async (cls: ClassGroup) => {
    const assignedCount = students.filter(s => s.kelas === cls.name && s.status !== 'alumni').length;
    let msg = `Apakah Anda yakin ingin menghapus kelas "${cls.name}"?`;
    if (assignedCount > 0) {
      msg = `Perhatian: Ada ${assignedCount} siswa terdaftar di kelas "${cls.name}". Menghapus kelas tidak akan menghapus data siswa, tetapi nama kelas pada siswa tersebut perlu diperbarui. Lanjutkan menghapus?`;
    }
    if (confirm(msg)) {
      await onDeleteClass(cls.id);
    }
  };

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    const matchesBranch = selectedBranchFilter === 'all' || (cls.branch || 'Pusat') === selectedBranchFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      cls.name.toLowerCase().includes(q) ||
      (cls.teacherName || '').toLowerCase().includes(q) ||
      (cls.scheduleDays || '').toLowerCase().includes(q) ||
      (cls.room || '').toLowerCase().includes(q) ||
      (cls.level || '').toLowerCase().includes(q);
    return matchesBranch && matchesSearch;
  });

  // Calculate statistics
  const totalClasses = filteredClasses.length;
  const totalQuota = filteredClasses.reduce((acc, c) => acc + (c.quota || 0), 0);
  const totalEnrolled = filteredClasses.reduce((acc, c) => {
    const enrolled = students.filter(s => s.kelas === c.name && s.status !== 'alumni').length;
    return acc + enrolled;
  }, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className={`p-6 rounded-3xl border ${
        isLight ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-900/80 border-slate-800 shadow-xl'
      } flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Manajemen Kelas Bimbingan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur kelompok belajar, pengajar, jadwal les, ruangan, dan kuota siswa tiap cabang.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-2.5 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        } flex items-center gap-3.5`}>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Layers size={20} />
          </div>
          <div>
            <span className={`text-xs font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Kelas</span>
            <span className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalClasses} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Kelompok</span></span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        } flex items-center gap-3.5`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Users size={20} />
          </div>
          <div>
            <span className={`text-xs font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Siswa Terdaftar di Kelas</span>
            <span className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalEnrolled} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Siswa</span></span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        } flex items-center gap-3.5`}>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Sparkles size={20} />
          </div>
          <div>
            <span className={`text-xs font-semibold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Kapasitas Kuota Bangku</span>
            <span className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalQuota} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tempat</span></span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-4 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
      } flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kelas, pengajar, jadwal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border transition ${
              isLight 
                ? 'bg-slate-50 border-slate-200 focus:bg-white text-slate-800' 
                : 'bg-slate-950/60 border-slate-800 focus:border-slate-700 text-slate-200'
            }`}
          />
        </div>

        {isSuperAdmin && branches.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Building2 size={15} className="text-slate-400" />
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className={`py-2 px-3 rounded-xl text-xs border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <option value="all">Semua Cabang</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>Cabang {b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Class Cards Grid */}
      {filteredClasses.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800'
        }`}>
          <Layers size={40} className="mx-auto text-slate-500 mb-3 opacity-50" />
          <h3 className="text-base font-bold mb-1">Belum Ada Data Kelas</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Silakan buat kelas baru untuk mulai mengelompokkan siswa bimbingan jaritmatika di cabang Anda.
          </p>
          <button
            onClick={handleOpenAdd}
            className="py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow"
          >
            + Tambah Kelas Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const enrolledStudents = students.filter(s => s.kelas === cls.name && s.status !== 'alumni');
            const count = enrolledStudents.length;
            const max = cls.quota || 12;
            const percentage = Math.min(100, Math.round((count / max) * 100));

            return (
              <div
                key={cls.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition hover:shadow-lg ${
                  isLight 
                    ? 'bg-white border-slate-200/80 hover:border-indigo-200' 
                    : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/30'
                }`}
              >
                <div>
                  {/* Header Class Card */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                        isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-950/50 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        Cabang {cls.branch || 'Pusat'}
                      </span>
                      <h3 className={`text-base font-extrabold leading-snug ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                        {cls.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cls)}
                        title="Edit Kelas"
                        className={`p-1.5 rounded-lg transition ${
                          isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cls)}
                        title="Hapus Kelas"
                        className={`p-1.5 rounded-lg transition ${
                          isLight ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-950/40 text-red-400'
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Class Info Details */}
                  <div className={`space-y-2 text-xs mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-indigo-500 shrink-0" />
                      <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{cls.scheduleDays || 'Belum diatur'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-sky-500 shrink-0" />
                      <span>{cls.scheduleTime || 'Belum diatur'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-emerald-500 shrink-0" />
                      <span>Pengajar: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>{cls.teacherName || 'Pengajar Utama'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DoorClosed size={13} className="text-amber-500 shrink-0" />
                      <span>Ruangan: <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{cls.room || 'Ruang A1'}</span></span>
                    </div>
                    {cls.level && (
                      <div className={`flex items-center gap-2 pt-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/50'}`}>
                        <BookOpen size={13} className="text-violet-500 shrink-0" />
                        <span className={`truncate text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{cls.level}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quota Progress Bar & Actions */}
                <div className={`pt-3 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Terisi:</span>
                      <span className={`font-bold ${
                        percentage >= 100 ? 'text-red-400' : percentage >= 80 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {count} / {max} Siswa ({percentage}%)
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${
                      isLight ? 'bg-slate-100' : 'bg-slate-800'
                    }`}>
                      <div 
                        className={`h-full transition-all duration-300 ${
                          percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingClassStudents(cls)}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 border ${
                      isLight
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-950/30 hover:bg-indigo-950/50 text-indigo-300 border-indigo-500/20'
                    }`}
                  >
                    <Users size={13} />
                    <span>Lihat {count} Siswa Terdaftar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Class */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'
            }`}>
              <div className="flex items-center gap-2">
                <Layers className="text-indigo-500" size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  {editingClass ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Nama Kelas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas Reguler A (Senin & Rabu)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Hari Les / Bimbingan
                  </label>
                  <select
                    value={scheduleDays}
                    onChange={(e) => setScheduleDays(e.target.value)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <option value="Senin & Rabu">Senin & Rabu</option>
                    <option value="Selasa & Kamis">Selasa & Kamis</option>
                    <option value="Jumat & Ahad">Jumat & Ahad</option>
                    <option value="Sabtu & Ahad">Sabtu & Ahad</option>
                    <option value="Senin - Jumat">Senin - Jumat (Harian)</option>
                    <option value="Khusus Weekend">Khusus Weekend</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Jam Sesi Bimbingan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 14:00 - 15:30"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Nama Pengajar / Tentor
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kak Febrianti Dewi"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Kuota Bangku Siswa
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quota}
                    onChange={(e) => setQuota(Number(e.target.value))}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Ruangan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ruang A1"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Cabang
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={!isSuperAdmin && activeBranch !== 'all'}
                    className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>Cabang {b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Materi / Kurikulum Utama Kelas
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  {levelsList.map((lvl, idx) => (
                    <option key={idx} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                >
                  {editingClass ? 'Simpan Perubahan' : 'Tambah Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Enrolled Students */}
      {viewingClassStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'
            }`}>
              <div className="flex items-center gap-2">
                <Users className="text-indigo-500" size={18} />
                <div>
                  <h3 className="font-bold text-sm">
                    Daftar Siswa: {viewingClassStudents.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cabang {viewingClassStudents.branch || 'Pusat'} • {viewingClassStudents.scheduleDays} ({viewingClassStudents.scheduleTime})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingClassStudents(null)}
                className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {(() => {
                const classStudents = students.filter(s => s.kelas === viewingClassStudents.name && s.status !== 'alumni');
                if (classStudents.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-xs">Belum ada siswa yang dimasukkan ke kelas ini.</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Anda dapat memilih kelas ini saat menambah atau mengedit siswa pada menu Siswa.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-400 mb-2 font-medium">
                      Total {classStudents.length} siswa terdaftar di kelas ini:
                    </div>
                    <div className="divide-y divide-slate-800/60 border rounded-2xl overflow-hidden border-slate-800">
                      {classStudents.map((s, idx) => (
                        <div key={s.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/20 transition">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                            <div>
                              <span className="text-xs font-bold block text-slate-200">{s.name}</span>
                              <span className="text-[11px] text-slate-400">Orang Tua: {s.parentName} ({s.parentPhone})</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {s.level || 'Level 1'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className={`px-6 py-3 border-t text-right ${
              isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'
            }`}>
              <button
                onClick={() => setViewingClassStudents(null)}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700"
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
