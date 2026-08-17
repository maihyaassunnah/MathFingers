import React, { useState, useRef, useEffect } from 'react';
import { Student, LearningMaterial, Attendance, TeacherNote, Grade, Branch, ClassGroup } from '../types';
import { formatWhatsAppPhone, getWhatsAppLink, getStudentUniqueCode } from '../utils';
import { generateStudentPDFReport } from '../utils/pdfGenerator';
import { Search, Plus, UserPlus, Phone, Calendar, BookOpen, Trash2, Edit2, CheckCircle, XCircle, AlertCircle, Download, Award, Video, ExternalLink, Eye, X, Image as ImageIcon, Check, Layers, Users, Camera, Upload, RotateCcw, User, Sparkles, RefreshCw } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import { OfflineIndicator } from './OfflineIndicator';

interface StudentManagerProps {
  students: Student[];
  materials: LearningMaterial[];
  attendance: Attendance[];
  notes: TeacherNote[];
  grades: Grade[];
  classes?: ClassGroup[];
  onAddStudent: (data: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  theme?: string;
  isSuperAdmin?: boolean;
  branches?: Branch[];
  loading?: boolean;
}

export function StudentManager({ 
  students, 
  materials = [],
  attendance = [],
  notes = [],
  grades = [],
  classes = [],
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent,
  theme = 'dark',
  isSuperAdmin = false,
  branches = [],
  loading = false
}: StudentManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortAlphabetical, setSortAlphabetical] = useState<'asc' | 'desc'>('asc');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [kelasFilter, setKelasFilter] = useState<string>('All');
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
  const [hariLes, setHariLes] = useState('Hari Jumat dan Ahad');
  const [branch, setBranch] = useState(() => branches[0]?.name || 'Pusat');
  const [kelas, setKelas] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Camera & Photo State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [capturedPhotoTemp, setCapturedPhotoTemp] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (deviceId?: string) => {
    stopCamera();
    setIsCameraStarting(true);
    setCameraError(null);
    setCapturedPhotoTemp(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 640 } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.log('Autoplay handled', e));
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter(d => d.kind === 'videoinput');
        setCameraDevices(videoDevs);
        if (deviceId) {
          setSelectedCameraId(deviceId);
        } else if (videoDevs.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoDevs[0].deviceId);
        }
      } catch (e) {
        console.warn('Could not enumerate devices', e);
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setCameraError(
        err?.name === 'NotAllowedError' 
          ? 'Izin akses kamera ditolak. Silakan izinkan akses kamera di peramban (browser) Anda.'
          : 'Tidak dapat mengakses kamera pada perangkat ini.'
      );
    } finally {
      setIsCameraStarting(false);
    }
  };

  const capturePhotoFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 480;
    const height = video.videoHeight || 480;
    const size = Math.min(width, height);
    const outSize = 360;
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop square
    const sx = (width - size) / 2;
    const sy = (height - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, outSize, outSize);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhotoTemp(dataUrl);
  };

  const applyCapturedPhoto = () => {
    if (capturedPhotoTemp) {
      setPhotoUrl(capturedPhotoTemp);
    }
    stopCamera();
    setIsCameraModalOpen(false);
    setCapturedPhotoTemp(null);
  };

  const retakeCapturedPhoto = () => {
    setCapturedPhotoTemp(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const closeCameraModal = () => {
    stopCamera();
    setIsCameraModalOpen(false);
    setCapturedPhotoTemp(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;
        const size = Math.min(width, height);
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Center crop square
          const sx = (width - size) / 2;
          const sy = (height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, maxDim, maxDim);
          setPhotoUrl(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          setPhotoUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Curriculum overlay modal states
  const [selectedCurriculumMat, setSelectedCurriculumMat] = useState<LearningMaterial | null>(null);
  const [selectedCurriculumFullImg, setSelectedCurriculumFullImg] = useState<string | null>(null);
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);

  // Bulk Edit States
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('NO_CHANGE');
  const [bulkClass, setBulkClass] = useState<string>('NO_CHANGE');
  const [customBulkClass, setCustomBulkClass] = useState<string>('');
  const [bulkBranch, setBulkBranch] = useState<string>('NO_CHANGE');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

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
    setHariLes('Hari Jumat dan Ahad');
    setBranch(branches[0]?.name || 'Pusat');
    setKelas('');
    setPhotoUrl('');
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
    setHariLes(student.hariLes || 'Hari Jumat dan Ahad');
    setBranch(student.branch || 'Pusat');
    setKelas(student.kelas || '');
    setPhotoUrl(student.photoUrl || '');
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
      hariLes,
      branch,
      kelas,
      photoUrl: photoUrl || undefined
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

  // Dynamic options for Branch and Class filters - 2 Cabang Real: Singkut, Bangko
  const availableBranches = Array.from(
    new Set([
      'Singkut',
      'Bangko',
      ...branches.map(b => b.name),
      ...students.map(s => s.branch).filter((b): b is string => Boolean(b && b.trim()))
    ])
  )
    .filter((b): b is string => Boolean(b && b.trim() && b.toLowerCase() !== 'bandung' && b.toLowerCase() !== 'pusat' && b.toLowerCase() !== 'all' && b.toLowerCase() !== 'semua'))
    .map(b => {
      const lower = b.toLowerCase().trim();
      if (lower === 'singkut') return 'Singkut';
      if (lower === 'bangko') return 'Bangko';
      return b;
    })
    .filter((b, idx, arr) => arr.indexOf(b) === idx);

  const availableClasses = Array.from(
    new Set([
      ...classes.map(c => c.name),
      ...students.map(s => s.kelas).filter((k): k is string => Boolean(k && k.trim()))
    ])
  ).filter(Boolean);

  // Filter Logic
  const filteredStudents = students.filter(student => {
    // Exclude alumni from the current students directory
    if (student.status === 'alumni') return false;

    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.parentPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    const matchesGender = genderFilter === 'All' || student.jenisKelamin === genderFilter;
    const matchesBranch = branchFilter === 'All' || (student.branch || 'Pusat') === branchFilter;
    const matchesClass = kelasFilter === 'All' || (student.kelas || '') === kelasFilter;

    return matchesSearch && matchesStatus && matchesGender && matchesBranch && matchesClass;
  });

  // Sort Logic (Alphabetical)
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortAlphabetical === 'asc') {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  // Bulk Selection Handlers
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(sortedStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) return;

    const updates: Partial<Student> = {};

    if (bulkStatus !== 'NO_CHANGE') {
      updates.status = bulkStatus as 'active' | 'inactive' | 'alumni';
    }

    if (bulkClass === 'CLEAR') {
      updates.kelas = '';
    } else if (bulkClass === 'CUSTOM') {
      if (customBulkClass.trim()) {
        updates.kelas = customBulkClass.trim();
      }
    } else if (bulkClass !== 'NO_CHANGE') {
      updates.kelas = bulkClass;
    }

    if (bulkBranch !== 'NO_CHANGE') {
      updates.branch = bulkBranch;
    }

    if (Object.keys(updates).length === 0) {
      alert('Mohon pilih minimal satu opsi data (Status, Kelas, atau Cabang) yang ingin diubah.');
      return;
    }

    const confirmMsg = `Apakah Anda yakin ingin memperbarui data ${selectedStudentIds.length} siswa terpilih sekaligus?`;
    if (!confirm(confirmMsg)) return;

    setIsBulkUpdating(true);
    try {
      await Promise.all(selectedStudentIds.map(id => onUpdateStudent(id, updates)));
      alert(`Berhasil memperbarui data ${selectedStudentIds.length} siswa!`);
      setSelectedStudentIds([]);
      setIsBulkModalOpen(false);
      // Reset form
      setBulkStatus('NO_CHANGE');
      setBulkClass('NO_CHANGE');
      setCustomBulkClass('');
      setBulkBranch('NO_CHANGE');
    } catch (err) {
      console.error(err);
      alert(`Gagal memperbarui data siswa: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const isLight = theme === 'light';

  return (
    <div id="student-manager-section" className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className={`text-xl sm:text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Database Siswa Math Fingers</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm flex items-center gap-1.5">
                <Users size={14} />
                <span>{sortedStudents.length} Siswa</span>
              </span>
              <button
                id="btn-add-student"
                onClick={handleOpenAdd}
                className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:scale-105 active:scale-95 transition flex items-center justify-center shrink-0 cursor-pointer"
                title="Tambah Siswa Baru"
              >
                <Plus size={18} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-xs sm:text-sm mt-1`}>Kelola pendaftaran, level bimbingan, dan data kontak wali siswa.</p>
        </div>
      </div>

      {/* Filter and Search Bar - Compact Single Line */}
      <div className={`p-2.5 sm:p-3 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-2 items-center ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full md:w-60 lg:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
          <input
            id="student-search-input"
            type="text"
            placeholder="Cari siswa, wali, HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs placeholder:text-slate-500 ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-800' 
                : 'bg-slate-950/40 border-slate-800 text-white'
            }`}
          />
        </div>
        
        {/* Compact Single Line Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full py-0.5 whitespace-nowrap">
          {/* Urutan Abjad */}
          <CustomDropdown
            id="sort-student-alphabetical"
            value={sortAlphabetical}
            onChange={(val) => setSortAlphabetical(val as 'asc' | 'desc')}
            options={[
              { value: 'asc', label: 'Nama: A - Z' },
              { value: 'desc', label: 'Nama: Z - A' }
            ]}
            theme={theme}
            className="shrink-0 text-xs !w-auto min-w-[120px]"
          />

          {/* Cabang Filter - Hanya jika Super Admin */}
          {isSuperAdmin && (
            <CustomDropdown
              id="filter-student-branch"
              value={branchFilter}
              onChange={(val) => setBranchFilter(val)}
              options={[
                { value: 'All', label: 'Semua Cabang' },
                ...availableBranches.map(b => ({ value: b, label: `Cabang: ${b}` }))
              ]}
              theme={theme}
              className="shrink-0 text-xs !w-auto min-w-[130px]"
            />
          )}

          {/* Kelas Filter */}
          <CustomDropdown
            id="filter-student-kelas"
            value={kelasFilter}
            onChange={(val) => setKelasFilter(val)}
            options={[
              { value: 'All', label: 'Semua Kelas' },
              ...availableClasses.map(k => ({ value: k, label: `Kelas: ${k}` }))
            ]}
            theme={theme}
            className="shrink-0 text-xs !w-auto min-w-[130px]"
          />

          {/* Gender Filter */}
          <CustomDropdown
            id="filter-student-gender"
            value={genderFilter}
            onChange={(val) => setGenderFilter(val)}
            options={[
              { value: 'All', label: 'Semua Gender' },
              { value: 'Laki-laki', label: 'Laki-laki' },
              { value: 'Perempuan', label: 'Perempuan' }
            ]}
            theme={theme}
            className="shrink-0 text-xs !w-auto min-w-[125px]"
          />

          {/* Status Filter */}
          <CustomDropdown
            id="filter-student-status"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'All', label: 'Semua Status' },
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Nonaktif' }
            ]}
            theme={theme}
            className="shrink-0 text-xs !w-auto min-w-[120px]"
          />

          {/* Reset Filter Button */}
          {(searchQuery || statusFilter !== 'active' || genderFilter !== 'All' || branchFilter !== 'All' || kelasFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('active');
                setGenderFilter('All');
                setBranchFilter('All');
                setKelasFilter('All');
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition flex items-center gap-1 cursor-pointer shrink-0"
              title="Reset Semua Filter"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Selection Sticky Action Banner */}
      {selectedStudentIds.length > 0 && (
        <div className={`p-4 rounded-2xl shadow-xl border flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-4 z-30 transition-all ${
          isLight ? 'bg-emerald-50/95 border-emerald-300 text-slate-800 shadow-emerald-500/10' : 'bg-slate-900/95 border-emerald-500/40 text-white backdrop-blur-md shadow-black/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-sm border border-emerald-500/30 shrink-0">
              {selectedStudentIds.length}
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>{selectedStudentIds.length} Siswa Terpilih</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                  {selectedStudentIds.length} dari {sortedStudents.length}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Ubah status, kelas, atau cabang untuk semua siswa yang dicentang secara bersamaan.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Edit2 size={15} />
              <span>Edit Massal ({selectedStudentIds.length} Siswa)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

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
              <OfflineIndicator theme={theme} className="mb-2" />

              {/* Profile Photo Section */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="relative group shrink-0">
                  <div className={`w-24 h-24 rounded-2xl overflow-hidden border-2 flex items-center justify-center shadow-md ${
                    photoUrl 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : isLight ? 'border-dashed border-slate-300 bg-white' : 'border-dashed border-slate-700 bg-slate-950'
                  }`}>
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt="Foto Profil Siswa" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <User size={30} className="text-slate-400 mb-1 opacity-70" />
                        <span className="text-[10px] font-medium leading-tight">Belum Ada Foto</span>
                      </div>
                    )}
                  </div>

                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg transition"
                      title="Hapus Foto"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Foto Profil Siswa
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Foto akan dicetak pada kartu QR siswa & raport agar lebih personal.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCameraModalOpen(true);
                        startCamera();
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Camera size={14} />
                      <span>{photoUrl ? 'Ganti (Kamera)' : 'Ambil Foto (Kamera)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                        isLight 
                          ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' 
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                      }`}
                    >
                      <Upload size={14} />
                      <span>Unggah File</span>
                    </button>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                  </div>
                </div>
              </div>

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
                  <CustomDropdown
                    value={status}
                    onChange={(val) => setStatus(val as 'active' | 'inactive' | 'alumni')}
                    options={[
                      { value: 'active', label: 'Aktif' },
                      { value: 'inactive', label: 'Nonaktif' },
                      { value: 'alumni', label: 'Alumni (Lulus)' }
                    ]}
                    theme={theme}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Level Bimbingan (Administratif)</label>
                <CustomDropdown
                  value={level}
                  onChange={(val) => setLevel(val)}
                  options={levels.map(l => ({ value: l, label: l }))}
                  theme={theme}
                  className="w-full"
                />
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
                  <CustomDropdown
                    value={jenisPaket}
                    onChange={(val) => setJenisPaket(val)}
                    options={[
                      { value: '4P', label: '4P' },
                      { value: '8P', label: '8P' }
                    ]}
                    theme={theme}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
                  <CustomDropdown
                    value={jenisKelamin}
                    onChange={(val) => setJenisKelamin(val as 'Laki-laki' | 'Perempuan')}
                    options={[
                      { value: 'Laki-laki', label: 'Laki-laki' },
                      { value: 'Perempuan', label: 'Perempuan' }
                    ]}
                    theme={theme}
                    className="w-full"
                  />
                </div>
              </div>

              {(isSuperAdmin || branches.length > 0) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cabang Bimbingan *</label>
                  <CustomDropdown
                    value={branch}
                    onChange={(val) => setBranch(val)}
                    options={branches.length > 0 ? branches.map(b => ({ value: b.name, label: b.name })) : [{ value: 'Pusat', label: 'Pusat' }]}
                    theme={theme}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Pilih Kelas Bimbingan</span>
                  <span className="text-[10px] text-indigo-400 font-normal">Opsional</span>
                </label>
                <CustomDropdown
                  value={kelas}
                  onChange={(val) => setKelas(val)}
                  options={[
                    { value: '', label: '-- Belum Ditentukan / Tanpa Kelas --' },
                    ...classes
                      .filter(c => !branch || c.branch === branch || branch === 'all')
                      .map((c) => ({
                        value: c.name,
                        label: `${c.name} (${c.scheduleDays || 'Jadwal'} • ${c.teacherName || 'Pengajar'})`
                      }))
                  ]}
                  theme={theme}
                  className="w-full"
                />
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
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <th className="p-4 w-12 text-center">NO</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Orang Tua / HP</th>
                  <th className="p-4 hidden sm:table-cell">Level</th>
                  <th className="p-4 hidden sm:table-cell">Materi Aktif</th>
                  <th className="p-4">Gabung Sejak</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {[...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4 text-center">
                      <div className={`h-4 w-4 rounded mx-auto ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`h-5 w-36 rounded ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                        <div className={`h-4 w-12 rounded ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                        <div className={`h-4 w-10 rounded ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                      </div>
                      <div className={`h-3 w-48 rounded mt-2 ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`} />
                    </td>
                    <td className="p-4">
                      <div className={`h-4 w-28 rounded ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                      <div className={`h-3 w-20 rounded mt-1.5 ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`} />
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <div className={`h-4 w-28 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-850'}`} />
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <div className={`h-4 w-20 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-850'}`} />
                    </td>
                    <td className="p-4">
                      <div className={`h-4 w-16 rounded ${isLight ? 'bg-slate-100' : 'bg-slate-850'}`} />
                    </td>
                    <td className="p-4">
                      <div className={`h-5 w-14 rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <div className={`h-8 w-8 rounded-lg ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                        <div className={`h-8 w-8 rounded-lg ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                        <div className={`h-8 w-8 rounded-lg ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sortedStudents.length === 0 ? (
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
                  <th className="p-4 w-16 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {selectedStudentIds.length > 0 && (
                        <input
                          type="checkbox"
                          checked={sortedStudents.length > 0 && selectedStudentIds.length === sortedStudents.length}
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-400 cursor-pointer"
                          title="Pilih Semua Siswa"
                        />
                      )}
                      <span>NO</span>
                    </div>
                  </th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4 hidden sm:table-cell">Orang Tua / HP</th>
                  <th className="p-4 hidden sm:table-cell">Level</th>
                  <th className="p-4 hidden sm:table-cell">Materi Aktif</th>
                  <th className="p-4 hidden sm:table-cell">Gabung Sejak</th>
                  <th className="p-4 hidden sm:table-cell">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/80 text-slate-300'}`}>
                {sortedStudents.map((student, index) => {
                  const waText = `Halo Ibu/Bapak ${student.parentName}, salam kenal dari Math Fingers. Ada perkembangan les yang ingin kami infokan terkait ananda ${student.name}.`;
                  const waLink = getWhatsAppLink(student.parentPhone, waText);
                  const isSelected = selectedStudentIds.includes(student.id);

                  return (
                    <tr key={student.id} className={`group/row transition duration-150 ${
                      isSelected 
                        ? isLight ? 'bg-emerald-50/60 hover:bg-emerald-100/60' : 'bg-emerald-950/30 hover:bg-emerald-950/50'
                        : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20'
                    }`}>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student.id)}
                            className={`w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-400 cursor-pointer transition-opacity ${
                              (isSelected || selectedStudentIds.length > 0)
                                ? 'opacity-100'
                                : 'opacity-0 group-hover/row:opacity-100'
                            }`}
                            title="Pilih Siswa"
                          />
                          <span className="font-bold text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => setSelectedDetailStudent(student)}
                            className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-emerald-500/20 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:opacity-85 transition shadow-xs"
                            title="Klik untuk lihat detail & foto"
                          >
                            {student.photoUrl ? (
                              <img 
                                src={student.photoUrl} 
                                alt={student.name} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-teal-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar">
                              <span 
                                onClick={() => setSelectedDetailStudent(student)}
                                className={`font-semibold text-sm sm:text-base cursor-pointer hover:underline ${isLight ? 'text-slate-800' : 'text-white'}`}
                              >
                                {student.name}
                              </span>
                              <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 shrink-0" title="Nomor Unik Siswa">
                                #{getStudentUniqueCode(student)}
                              </span>
                              {student.jenisKelamin && (
                                <span className={`hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                  student.jenisKelamin === 'Laki-laki' 
                                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/15'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/15'
                                }`}>
                                  {student.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                                </span>
                              )}
                              {student.jenisPaket && (
                                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 shrink-0">
                                  {student.jenisPaket}
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/15 shrink-0" title="Cabang Bimbingan">
                                🏢 {student.branch || 'Pusat'}
                              </span>
                              {student.kelas && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 shrink-0" title="Kelas Bimbingan">
                                  🏫 {student.kelas}
                                </span>
                              )}
                            </div>

                            {/* Lahir & Alamat Sejajar - Hidden on mobile */}
                            {((student.tempatLahir || student.tanggalLahir) || student.alamat) && (
                              <div className={`hidden sm:flex text-xs mt-1 flex-wrap gap-x-2 items-center leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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
                              <div className={`hidden sm:inline-block text-xs mt-1.5 px-2 py-0.5 rounded-md border max-w-[220px] truncate ${
                                isLight 
                                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-700' 
                                  : 'bg-amber-500/10 border-amber-500/10 text-amber-300'
                              }`} title={student.keterangan}>
                                Ket: {student.keterangan}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 space-y-1 hidden sm:table-cell">
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
                      <td className="p-4 hidden sm:table-cell">
                        {(() => {
                          const rawLevel = student.level || 'Level Dasar: Pengenalan Simbol Jari';
                          let line1 = rawLevel;
                          let line2 = '';

                          if (rawLevel.includes(':')) {
                            const idx = rawLevel.indexOf(':');
                            line1 = `${rawLevel.substring(0, idx).trim()}:`;
                            line2 = rawLevel.substring(idx + 1).trim();
                          } else {
                            const words = rawLevel.trim().split(' ');
                            if (words.length >= 2 && words[0].toLowerCase() === 'level') {
                              line1 = `${words[0]} ${words[1]}`;
                              line2 = words.slice(2).join(' ');
                            } else if (words.length >= 2) {
                              line1 = words[0];
                              line2 = words.slice(1).join(' ');
                            }
                          }

                          return (
                            <div className={`text-xs leading-snug ${isLight ? 'text-black' : 'text-slate-100'}`}>
                              <div className="font-bold">{line1}</div>
                              {line2 && <div className="font-medium mt-0.5">{line2}</div>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-4 hidden sm:table-cell">
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
                      <td className={`p-4 text-xs hidden sm:table-cell ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{student.joinDate}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
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
                            type="button"
                            onClick={() => setSelectedDetailStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Lihat Detail Profil Siswa"
                          >
                            <Eye size={16} />
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
                    <CustomDropdown
                      value={selectedCurriculumMat.id}
                      onChange={(val) => {
                        const matched = materials.find(m => m.id === val);
                        if (matched) setSelectedCurriculumMat(matched);
                      }}
                      options={materials.map(m => ({
                        value: m.id,
                        label: m.level || 'Umum'
                      }))}
                      theme={theme}
                      className="min-w-[120px]"
                    />
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

      {/* Pop-up Modal Detail Siswa */}
      {selectedDetailStudent && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            {/* Header Modal */}
            <div className={`p-5 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 border-emerald-500/30 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md">
                  {selectedDetailStudent.photoUrl ? (
                    <img 
                      src={selectedDetailStudent.photoUrl} 
                      alt={selectedDetailStudent.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-teal-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xl flex items-center justify-center">
                      {selectedDetailStudent.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {selectedDetailStudent.name}
                    </h3>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      #{getStudentUniqueCode(selectedDetailStudent)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Detail Lengkap Profil Siswa</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailStudent(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500 hover:text-white transition flex items-center justify-center text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Body Modal Detail */}
            <div className="p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm">
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
              }`}>
                <div>
                  <span className="text-[11px] text-slate-500 block">Status Keaktifan</span>
                  <span className={`font-bold ${
                    selectedDetailStudent.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}>
                    {selectedDetailStudent.status === 'active' ? 'Aktif' : selectedDetailStudent.status === 'alumni' ? 'Alumni (Lulus)' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20">
                    🏢 {selectedDetailStudent.branch || 'Pusat'}
                  </span>
                  {selectedDetailStudent.kelas && (
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      🏫 {selectedDetailStudent.kelas}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                  <span className="text-[11px] text-slate-500 block">Orang Tua / Wali</span>
                  <span className="font-bold">{selectedDetailStudent.parentName || '-'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                  <span className="text-[11px] text-slate-500 block mb-0.5">WhatsApp Orang Tua</span>
                  <a 
                    href={getWhatsAppLink(selectedDetailStudent.parentPhone, `Halo Ibu/Bapak ${selectedDetailStudent.parentName}, salam dari Math Fingers. Ada informasi terkait ${selectedDetailStudent.name}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Phone size={13} />
                    <span>{selectedDetailStudent.parentPhone || '-'}</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                  <span className="text-[11px] text-slate-500 block">Jenis Kelamin</span>
                  <span className="font-semibold">{selectedDetailStudent.jenisKelamin || '-'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                  <span className="text-[11px] text-slate-500 block">Jenis Paket</span>
                  <span className="font-semibold">{selectedDetailStudent.jenisPaket || '-'}</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                <span className="text-[11px] text-slate-500 block">Level Bimbingan</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedDetailStudent.level || '-'}</span>
              </div>

              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                <span className="text-[11px] text-slate-500 block">Tempat, Tanggal Lahir</span>
                <span className="font-semibold">
                  {selectedDetailStudent.tempatLahir || '-'}{selectedDetailStudent.tanggalLahir ? `, ${selectedDetailStudent.tanggalLahir}` : ''}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                <span className="text-[11px] text-slate-500 block">Alamat</span>
                <span className="font-semibold">{selectedDetailStudent.alamat || '-'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                  <span className="text-[11px] text-slate-500 block">Tanggal Bergabung</span>
                  <span className="font-semibold">{selectedDetailStudent.joinDate || '-'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/30 border-slate-800'}`}>
                  <span className="text-[11px] text-slate-500 block">Hari Les</span>
                  <span className="font-semibold">{selectedDetailStudent.hariLes || '-'}</span>
                </div>
              </div>

              {selectedDetailStudent.keterangan && (
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-amber-500/5 border-amber-500/20 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
                  <span className="text-[11px] font-bold block mb-0.5">Keterangan:</span>
                  <span>{selectedDetailStudent.keterangan}</span>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className={`p-4 border-t flex items-center justify-between gap-2 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/50'}`}>
              <button
                type="button"
                onClick={() => {
                  const st = selectedDetailStudent;
                  setSelectedDetailStudent(null);
                  handleOpenEdit(st);
                }}
                className="px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition flex items-center gap-1.5"
              >
                <Edit2 size={14} />
                <span>Edit Profil</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDetailStudent(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl border flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Edit Massal Siswa</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mengubah data <strong className="text-emerald-500">{selectedStudentIds.length} siswa</strong> terpilih sekaligus.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyBulkEdit} className="p-6 overflow-y-auto space-y-4 text-sm">
              <OfflineIndicator theme={theme} className="mb-2" />

              {/* Status Section */}
              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Ubah Status Siswa
                </label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="NO_CHANGE">-- Jangan Ubah Status (Tetap) --</option>
                  <option value="active">Status: Aktif</option>
                  <option value="inactive">Status: Nonaktif</option>
                  <option value="alumni">Status: Alumni (Lulus)</option>
                </select>
              </div>

              {/* Kelas Section */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Ubah Kelas Bimbingan
                </label>
                <select
                  value={bulkClass}
                  onChange={(e) => setBulkClass(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="NO_CHANGE">-- Jangan Ubah Kelas (Tetap) --</option>
                  <option value="CLEAR">❌ Kosongkan Kelas (Tanpa Kelas)</option>
                  <option value="CUSTOM">➕ Input Nama Kelas Baru...</option>
                  {availableClasses.map(clsName => (
                    <option key={clsName} value={clsName}>
                      Kelas: {clsName}
                    </option>
                  ))}
                </select>

                {bulkClass === 'CUSTOM' && (
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama kelas baru (contoh: Kelas C, Kelas Reguler Pagi)..."
                    value={customBulkClass}
                    onChange={(e) => setCustomBulkClass(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                )}
              </div>

              {/* Cabang Section */}
              <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. Ubah Cabang Bimbingan
                </label>
                <select
                  value={bulkBranch}
                  onChange={(e) => setBulkBranch(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="NO_CHANGE">-- Jangan Ubah Cabang (Tetap) --</option>
                  {availableBranches.map(brName => (
                    <option key={brName} value={brName}>
                      Cabang: {brName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={isBulkUpdating}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isBulkUpdating}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isBulkUpdating ? (
                    <span>Memproses ({selectedStudentIds.length})...</span>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Simpan Perubahan Massal ({selectedStudentIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Camera Capture Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-md shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800 text-white'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Ambil Foto Siswa</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Posisikan wajah siswa di tengah bingkai</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white transition flex items-center justify-center text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Video / Snapshot Viewport */}
            <div className="p-4 flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-inner border-2 border-emerald-500/30">
                {/* Live Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${capturedPhotoTemp ? 'hidden' : 'block'}`}
                />

                {/* Captured Photo Review */}
                {capturedPhotoTemp && (
                  <img
                    src={capturedPhotoTemp}
                    alt="Hasil Foto"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Camera Overlay Guide Frame */}
                {!capturedPhotoTemp && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Circular Target Frame */}
                    <div className="w-56 h-56 rounded-full border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 animate-ping" />
                    </div>
                  </div>
                )}

                {/* Loading / Error overlay */}
                {isCameraStarting && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-white">
                    <RefreshCw className="animate-spin text-emerald-400" size={28} />
                    <span className="text-xs font-medium">Menghubungkan ke kamera...</span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center gap-2.5 text-white">
                    <AlertCircle className="text-rose-400" size={32} />
                    <p className="text-xs font-medium text-rose-300">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => startCamera(selectedCameraId)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg shadow transition"
                    >
                      Coba Lagi
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Switcher (if multiple cameras) */}
              {cameraDevices.length > 1 && !capturedPhotoTemp && (
                <div className="mt-3 w-full max-w-[320px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Pilih Perangkat Kamera:</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    {cameraDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Kamera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className={`p-4 border-t flex items-center justify-between gap-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={closeCameraModal}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition"
              >
                Batal
              </button>

              {capturedPhotoTemp ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={retakeCapturedPhoto}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                      isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                    }`}
                  >
                    <RotateCcw size={14} />
                    <span>Ulangi Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={applyCapturedPhoto}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-md transition"
                  >
                    <Check size={14} />
                    <span>Gunakan Foto Ini</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isCameraStarting || !!cameraError}
                  onClick={capturePhotoFromVideo}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 shadow-lg hover:shadow-emerald-500/25 transition disabled:opacity-50 cursor-pointer"
                >
                  <Camera size={16} />
                  <span>Ambil Foto</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
