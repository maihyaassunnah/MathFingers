import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Student, Attendance, TeacherNote, Invoice, Installment, Grade, LearningMaterial, AppSettings, DashboardTask, Branch, AdminUser, ClassGroup } from '../types';
import { SEED_MATERIALS, generateInvoiceNo, updateDynamicPwaIcon } from '../utils';

// Helper to load localStorage fallbacks
const getLocalData = <T>(key: string, defaultVal: T): T => {
  try {
    const data = localStorage.getItem(`math_finggers_${key}`);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
};

// Helper to save to localStorage fallbacks
const saveLocalData = <T>(key: string, data: T) => {
  try {
    if (key === 'all_settings_map' && typeof data === 'object' && data !== null) {
      // Deduplicate alias keys before writing to localStorage to prevent quota overflow
      const compactMap: Record<string, any> = {};
      Object.entries(data as Record<string, any>).forEach(([k, v]) => {
        if (k === 'Semua' || (!k.startsWith('branch_') && k !== 'default')) {
          compactMap[k] = v;
        }
      });
      localStorage.setItem(`math_finggers_${key}`, JSON.stringify(compactMap));
      return;
    }
    localStorage.setItem(`math_finggers_${key}`, JSON.stringify(data));
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      console.warn(`localStorage quota exceeded for key: math_finggers_${key}. Attempting compact save...`);
      try {
        if (key === 'all_settings_map' && typeof data === 'object' && data !== null) {
          // Remove heavy base64 image strings if quota exceeded for localStorage fallback
          const lightweightMap: Record<string, any> = {};
          Object.entries(data as Record<string, any>).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
              lightweightMap[k] = { ...v, invoiceLogo: undefined, invoiceSignature: undefined, appIcon: undefined };
            }
          });
          localStorage.setItem(`math_finggers_${key}`, JSON.stringify(lightweightMap));
        } else if (key === 'settings' && typeof data === 'object' && data !== null) {
          const lightweightSettings = { ...(data as any), invoiceLogo: undefined, invoiceSignature: undefined, appIcon: undefined };
          localStorage.setItem(`math_finggers_${key}`, JSON.stringify(lightweightSettings));
        }
      } catch {
        // Silently catch secondary storage errors
      }
    } else {
      console.warn('Could not save to localStorage:', e?.message || e);
    }
  }
};

export function useMathFinggersDb() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  const [allSettingsMap, setAllSettingsMap] = useState<Record<string, AppSettings>>(() => {
    return getLocalData<Record<string, AppSettings>>('all_settings_map', {});
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    return getLocalData<AppSettings>('settings', {
      bankName: 'Bank BCA',
      bankAccountNo: '1234567890',
      bankAccountHolder: 'Admin Math Fingers',
      defaultSppAmount: 250000,
      accentColor: 'emerald',
      defaultTeacherName: 'Admin Math Fingers',
      invoicePrefix: 'INV/MF',
      branch: 'Semua',
      branches: 'Semua'
    });
  });

  const [dashboardTasks, setDashboardTasks] = useState<DashboardTask[]>(() => {
    return getLocalData<DashboardTask[]>('dashboard_tasks', []);
  });

  // Helper to generate a unique client-side ID for offline/optimistic records
  const generateId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 11);
  };

  // Fetch all data from Supabase or fallback to local
  const loadData = async () => {
    if (!supabase) {
      console.log('Supabase client not initialized. Using local storage fallback.');
      setIsOfflineFallback(true);
      loadAllFromLocalStorage();
      setLoading(false);
      return;
    }

    try {
      // Fetch Students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('createdAt', { ascending: false });

      if (studentsError) throw studentsError;

      // Fetch Attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*');

      if (attendanceError) throw attendanceError;

      // Fetch Notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*');

      if (notesError) throw notesError;

      // Fetch Invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('createdAt', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch Grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*');

      if (gradesError) throw gradesError;

      // Fetch Materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*');

      if (materialsError) throw materialsError;

      // Fetch Branches
      let branchesData = null;
      try {
        const { data, error } = await supabase.from('branches').select('*');
        if (!error) branchesData = data;
      } catch (e) {
        console.warn('Failed to fetch branches from Supabase:', e);
      }

      // Fetch Admin Users
      let adminUsersData = null;
      try {
        const { data, error } = await supabase.from('admin_users').select('*');
        if (!error) adminUsersData = data;
      } catch (e) {
        console.warn('Failed to fetch admin users from Supabase:', e);
      }

      // Fetch Classes
      let classesData = null;
      try {
        const { data, error } = await supabase.from('classes').select('*');
        if (!error) classesData = data;
      } catch (e) {
        console.warn('Failed to fetch classes from Supabase:', e);
      }

      // Fetch App Settings (All branch settings)
      let appSettingsRows: any[] = [];
      try {
        const { data, error } = await supabase.from('app_settings').select('*');
        if (!error && data) appSettingsRows = data;
      } catch (e) {
        console.warn('Failed to fetch app settings from Supabase:', e);
      }

      // Set state and save locally for offline capabilities
      const loadedStudents = studentsData || [];
      const loadedAttendance = (attendanceData || []).sort((a, b) => b.date.localeCompare(a.date));
      const loadedNotes = (notesData || []).sort((a, b) => b.date.localeCompare(a.date));
      const loadedInvoices = invoicesData || [];
      const loadedGrades = (gradesData || []).sort((a, b) => b.date.localeCompare(a.date));

      const loadedBranches = branchesData || getLocalData<Branch[]>('branches', [
        { id: 'br-1', name: 'Pusat', address: 'Kantor Pusat Math Fingers', phone: '08123456789', createdAt: 1719600000 },
        { id: 'br-2', name: 'Bandung', address: 'Cabang Kota Bandung', phone: '08123456780', createdAt: 1719600000 }
      ]);
      setBranches(loadedBranches);
      saveLocalData('branches', loadedBranches);

      const loadedAdminUsers = adminUsersData || getLocalData<AdminUser[]>('admin_users', [
        { username: 'febrianti', name: 'Febrianti Dewi', role: 'super_admin', branch: 'Pusat', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
        { username: 'dewi', name: 'Dewi Safitri', role: 'branch_admin', branch: 'Pusat', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' },
        { username: 'les_bandung', name: 'Les Privat Bandung', role: 'branch_admin', branch: 'Bandung', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200' }
      ]);
      setAdminUsers(loadedAdminUsers);
      saveLocalData('admin_users', loadedAdminUsers);

      const defaultClassesList: ClassGroup[] = [
        { id: 'cls-1', name: 'Kelas Reguler A (Senin & Rabu)', scheduleDays: 'Senin & Rabu', scheduleTime: '14:00 - 15:30', teacherName: 'Febrianti Dewi', quota: 12, room: 'Ruang A1', level: 'Level 1 : Penjumlahan & Pengurangan Angka Satuan', branch: 'Pusat', createdAt: 1719600000 },
        { id: 'cls-2', name: 'Kelas Reguler B (Selasa & Kamis)', scheduleDays: 'Selasa & Kamis', scheduleTime: '15:30 - 17:00', teacherName: 'Dewi Safitri', quota: 10, room: 'Ruang A2', level: 'Level 2 : Penjumlahan & Pengurangan Angka Puluhan', branch: 'Pusat', createdAt: 1719600000 },
        { id: 'cls-3', name: 'Kelas Weekend Bandung', scheduleDays: 'Sabtu & Ahad', scheduleTime: '09:00 - 10:30', teacherName: 'Les Privat Bandung', quota: 15, room: 'Ruang Utama', level: 'Level 1 : Penjumlahan & Pengurangan Angka Satuan', branch: 'Bandung', createdAt: 1719600000 }
      ];
      const loadedClasses = classesData || getLocalData<ClassGroup[]>('classes', defaultClassesList);
      setClasses(loadedClasses);
      saveLocalData('classes', loadedClasses);

      if (appSettingsRows && appSettingsRows.length > 0) {
        const loadedMap: Record<string, AppSettings> = { ...allSettingsMap };
        appSettingsRows.forEach(row => {
          const branchKey = row.branch || row.branches || (row.id !== 'default' ? row.id : 'Semua');
          const remoteSettings: AppSettings = {
            bankName: row.bankName ?? 'Bank BCA',
            bankAccountNo: row.bankAccountNo ?? '1234567890',
            bankAccountHolder: row.bankAccountHolder ?? 'Admin Math Fingers',
            defaultSppAmount: Number(row.defaultSppAmount) || 250000,
            accentColor: row.accentColor ?? 'emerald',
            defaultTeacherName: row.defaultTeacherName ?? 'Admin Math Fingers',
            invoicePrefix: row.invoicePrefix ?? 'INV/MF',
            invoiceLogo: row.invoiceLogo || undefined,
            invoiceSignature: row.invoiceSignature || undefined,
            appIcon: row.appIcon || undefined,
            branch: branchKey,
            branches: branchKey
          };
          loadedMap[branchKey] = remoteSettings;
          if (row.id) loadedMap[row.id] = remoteSettings;
        });
        setAllSettingsMap(loadedMap);
        saveLocalData('all_settings_map', loadedMap);

        const defaultOrSelected = loadedMap['Semua'] || loadedMap['default'] || Object.values(loadedMap)[0];
        if (defaultOrSelected) {
          setSettings(defaultOrSelected);
          saveLocalData('settings', defaultOrSelected);
          updateDynamicPwaIcon(defaultOrSelected.appIcon);
        }
      }

      setStudents(loadedStudents);
      saveLocalData('students', loadedStudents);

      setAttendance(loadedAttendance);
      saveLocalData('attendance', loadedAttendance);

      setNotes(loadedNotes);
      saveLocalData('notes', loadedNotes);

      setInvoices(loadedInvoices);
      saveLocalData('invoices', loadedInvoices);

      setGrades(loadedGrades);
      saveLocalData('grades', loadedGrades);

      // Detect if the materials table actually has the new column "capaianPembelajaran"
      const tableHasNewSchema = materialsData && materialsData.length > 0 && ("capaianPembelajaran" in materialsData[0]);

      // Only attempt to replace old records if the table supports the new schema format
      const hasOldMaterials = !materialsData || 
                              (SEED_MATERIALS.length > 0 && materialsData.length === 0) || 
                              (materialsData && tableHasNewSchema && materialsData.some(m => !m.capaianPembelajaran));

      if (hasOldMaterials && SEED_MATERIALS.length > 0) {
        if (supabase && materialsData && materialsData.length > 0 && tableHasNewSchema) {
          try {
            const oldIds = materialsData.map(m => m.id);
            await supabase.from('materials').delete().in('id', oldIds);
          } catch (e) {
            console.warn('Could not delete old materials:', e);
          }
        }
        await seedDefaultMaterialsToSupabase();
      } else {
        // Map database records (whether old or new schema format) to the modern LearningMaterial interface
        const loadedMats = (materialsData || []).map(m => ({
          id: m.id,
          level: m.level,
          capaianPembelajaran: m.capaianPembelajaran || m.description || '',
          kompetensiDasar: m.kompetensiDasar || '',
          materiPembelajaran: m.materiPembelajaran || m.title || m.level || '',
          indikatorPencapaian: m.indikatorPencapaian || '',
          videoUrl: m.videoUrl || '',
          tutorialImages: m.tutorialImages || []
        }));
        setMaterials(loadedMats);
        saveLocalData('materials', loadedMats);
      }

      setIsOfflineFallback(false);
    } catch (err) {
      console.warn('Supabase query failed, falling back to local storage:', err);
      setIsOfflineFallback(true);
      loadAllFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadAllFromLocalStorage = () => {
    const defaultBranches = [
      { id: 'br-1', name: 'Pusat', address: 'Kantor Pusat Math Fingers', phone: '08123456789', createdAt: 1719600000 },
      { id: 'br-2', name: 'Bandung', address: 'Cabang Kota Bandung', phone: '08123456780', createdAt: 1719600000 }
    ];
    setBranches(getLocalData<Branch[]>('branches', defaultBranches));

    const defaultAdminUsers: AdminUser[] = [
      { username: 'febrianti', name: 'Febrianti Dewi', role: 'super_admin', branch: 'Pusat', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
      { username: 'dewi', name: 'Dewi Safitri', role: 'branch_admin', branch: 'Pusat', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' },
      { username: 'les_bandung', name: 'Les Privat Bandung', role: 'branch_admin', branch: 'Bandung', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200' }
    ];
    setAdminUsers(getLocalData<AdminUser[]>('admin_users', defaultAdminUsers));

    const defaultClassesList: ClassGroup[] = [
      { id: 'cls-1', name: 'Kelas Reguler A (Senin & Rabu)', scheduleDays: 'Senin & Rabu', scheduleTime: '14:00 - 15:30', teacherName: 'Febrianti Dewi', quota: 12, room: 'Ruang A1', level: 'Level 1 : Penjumlahan & Pengurangan Angka Satuan', branch: 'Pusat', createdAt: 1719600000 },
      { id: 'cls-2', name: 'Kelas Reguler B (Selasa & Kamis)', scheduleDays: 'Selasa & Kamis', scheduleTime: '15:30 - 17:00', teacherName: 'Dewi Safitri', quota: 10, room: 'Ruang A2', level: 'Level 2 : Penjumlahan & Pengurangan Angka Puluhan', branch: 'Pusat', createdAt: 1719600000 },
      { id: 'cls-3', name: 'Kelas Weekend Bandung', scheduleDays: 'Sabtu & Ahad', scheduleTime: '09:00 - 10:30', teacherName: 'Les Privat Bandung', quota: 15, room: 'Ruang Utama', level: 'Level 1 : Penjumlahan & Pengurangan Angka Satuan', branch: 'Bandung', createdAt: 1719600000 }
    ];
    setClasses(getLocalData<ClassGroup[]>('classes', defaultClassesList));

    const localStudents = getLocalData<Student[]>('students', []);
    if (localStudents.length === 0) {
      const seedStudents: Student[] = [
        {
          id: 'std-1',
          name: 'Budi Santoso',
          parentName: 'Hermawan Santoso',
          parentPhone: '6281234567891',
          joinDate: '2026-03-01',
          level: 'Level 1 : Penjumlahan & Pengurangan Angka Satuan',
          status: 'active',
          keterangan: 'Anak sangat antusias belajar menggunakan jari.',
          tempatLahir: 'Jakarta',
          tanggalLahir: '2018-05-12',
          jenisPaket: '4P',
          jenisKelamin: 'Laki-laki',
          alamat: 'Jl. Merdeka No. 12, Jakarta Pusat',
          createdAt: Date.now() - 90 * 24 * 3600 * 1000,
          branch: 'Pusat'
        },
        {
          id: 'std-2',
          name: 'Siti Aminah',
          parentName: 'Rahmat Amin',
          parentPhone: '6281234567892',
          joinDate: '2026-04-15',
          level: 'Level 2 : Penjumlahan & Pengurangan Angka Puluhan',
          status: 'active',
          keterangan: 'Sudah menguasai simbol jari 1-10.',
          tempatLahir: 'Jakarta',
          tanggalLahir: '2017-09-20',
          jenisPaket: '8P',
          jenisKelamin: 'Perempuan',
          alamat: 'Komp. Harapan Indah Blok C3/5',
          createdAt: Date.now() - 45 * 24 * 3600 * 1000,
          branch: 'Pusat'
        },
        {
          id: 'std-3',
          name: 'Robert Chen',
          parentName: 'Chen Kok Liang',
          parentPhone: '6281234567893',
          joinDate: '2026-05-10',
          level: 'Level 3 : Penjumlahan & Pengurangan Angka Ratusan',
          status: 'active',
          keterangan: 'Sangat cepat dalam kuis perkalian dasar.',
          tempatLahir: 'Bandung',
          tanggalLahir: '2016-01-15',
          jenisPaket: '4P',
          jenisKelamin: 'Laki-laki',
          alamat: 'Dago Elok Blok B2 No. 8, Bandung',
          createdAt: Date.now() - 30 * 24 * 3600 * 1000,
          branch: 'Bandung'
        },
        {
          id: 'std-4',
          name: 'Amanda Putri',
          parentName: 'Sri Amanda',
          parentPhone: '6281234567894',
          joinDate: '2025-01-10',
          level: 'Level 7 : Perkalian Angka Puluhan & Puluhan',
          status: 'alumni',
          keterangan: 'Lulus dengan predikat Sangat Baik.',
          tempatLahir: 'Jakarta',
          tanggalLahir: '2015-11-12',
          jenisPaket: '8P',
          jenisKelamin: 'Perempuan',
          alamat: 'Jl. Kemang Raya No. 42',
          createdAt: Date.now() - 500 * 24 * 3600 * 1000,
          branch: 'Pusat'
        },
        {
          id: 'std-5',
          name: 'Kevin Wijaya',
          parentName: 'Hendra Wijaya',
          parentPhone: '6281234567895',
          joinDate: '2026-06-01',
          level: 'Level Dasar: Pengenalan Simbol Jari',
          status: 'active',
          keterangan: 'Baru mendaftar les privat.',
          tempatLahir: 'Bandung',
          tanggalLahir: '2019-12-05',
          jenisPaket: '4P',
          jenisKelamin: 'Laki-laki',
          alamat: 'Pasteur Residence No. 10B, Bandung',
          createdAt: Date.now() - 10 * 24 * 3600 * 1000,
          branch: 'Bandung'
        }
      ];
      saveLocalData('students', seedStudents);
      setStudents(seedStudents);

      const todayStr = new Date().toISOString().slice(0, 10);
      const seedAttendance: Attendance[] = [
        { id: 'att-1', studentId: 'std-1', studentName: 'Budi Santoso', date: todayStr, status: 'present', notes: 'Hadir belajar penjumlahan 1 digit', branch: 'Pusat' },
        { id: 'att-2', studentId: 'std-2', studentName: 'Siti Aminah', date: todayStr, status: 'present', notes: 'Hadir sangat tepat waktu', branch: 'Pusat' },
        { id: 'att-3', studentId: 'std-3', studentName: 'Robert Chen', date: todayStr, status: 'permission', notes: 'Izin karena acara keluarga', branch: 'Bandung' }
      ];
      saveLocalData('attendance', seedAttendance);
      setAttendance(seedAttendance);

      const seedNotes: TeacherNote[] = [
        { id: 'note-1', studentId: 'std-1', studentName: 'Budi Santoso', date: todayStr, topic: 'Penjumlahan Jari', content: 'Budi sudah mampu menjumlahkan angka satuan 1-9 dengan kalkulasi jari cepat.', teacherName: 'Febrianti Dewi', branch: 'Pusat' },
        { id: 'note-2', studentId: 'std-2', studentName: 'Siti Aminah', date: todayStr, topic: 'Angka Puluhan', content: 'Siti belajar kalkulasi puluhan menggunakan dua tangan lengkap.', teacherName: 'Dewi Safitri', branch: 'Pusat' }
      ];
      saveLocalData('notes', seedNotes);
      setNotes(seedNotes);

      const seedInvoices: Invoice[] = [
        { id: 'inv-1', invoiceNo: 'INV/MF/202607/001', studentId: 'std-1', studentName: 'Budi Santoso', amount: 250000, month: 'Juli 2026', dueDate: todayStr, status: 'paid', paidAt: todayStr, paymentMethod: 'Transfer', createdAt: Date.now() - 5 * 24 * 3600 * 1000, amountPaid: 250000, installments: [], category: 'spp', branch: 'Pusat' },
        { id: 'inv-2', invoiceNo: 'INV/MF/202607/002', studentId: 'std-2', studentName: 'Siti Aminah', amount: 250000, month: 'Juli 2026', dueDate: todayStr, status: 'unpaid', createdAt: Date.now() - 5 * 24 * 3600 * 1000, amountPaid: 0, installments: [], category: 'spp', branch: 'Pusat' },
        { id: 'inv-3', invoiceNo: 'INV/MF/202607/003', studentId: 'std-3', studentName: 'Robert Chen', amount: 300000, month: 'Juli 2026', dueDate: todayStr, status: 'unpaid', createdAt: Date.now() - 5 * 24 * 3600 * 1000, amountPaid: 0, installments: [], category: 'spp', branch: 'Bandung' }
      ];
      saveLocalData('invoices', seedInvoices);
      setInvoices(seedInvoices);

      const seedGrades: Grade[] = [
        { id: 'grd-1', studentId: 'std-1', studentName: 'Budi Santoso', date: todayStr, topic: 'Kuis Satuan Cepat', score: 95, speedSeconds: 12, notes: 'Sangat akurat dan sigap!', branch: 'Pusat' },
        { id: 'grd-2', studentId: 'std-2', studentName: 'Siti Aminah', date: todayStr, topic: 'Kuis Puluhan Dasar', score: 88, speedSeconds: 18, notes: 'Fokus perlu ditingkatkan sedikit lagi.', branch: 'Pusat' },
        { id: 'grd-3', studentId: 'std-3', studentName: 'Robert Chen', date: todayStr, topic: 'Kuis Kelulusan Level 2', score: 92, speedSeconds: 14, notes: 'Lulus dengan predikat istimewa.', branch: 'Bandung' }
      ];
      saveLocalData('grades', seedGrades);
      setGrades(seedGrades);
    } else {
      setStudents(localStudents);
      setAttendance(getLocalData<Attendance[]>('attendance', []));
      setNotes(getLocalData<TeacherNote[]>('notes', []));
      setInvoices(getLocalData<Invoice[]>('invoices', []));
      setGrades(getLocalData<Grade[]>('grades', []));
    }
    
    const localMats = getLocalData<LearningMaterial[]>('materials', []);
    const hasOldLocal = (SEED_MATERIALS.length > 0 && localMats.length === 0) || localMats.some(m => !m.capaianPembelajaran);
    if (hasOldLocal && SEED_MATERIALS.length > 0) {
      saveLocalData('materials', SEED_MATERIALS);
      setMaterials(SEED_MATERIALS);
    } else {
      setMaterials(localMats);
    }
  };

  const seedDefaultMaterialsToSupabase = async () => {
    if (!supabase) return;
    try {
      if (SEED_MATERIALS.length > 0) {
        // Map SEED_MATERIALS to include fallback title & description to satisfy older NOT NULL constraints
        const modernPayload = SEED_MATERIALS.map(m => ({
          ...m,
          title: m.materiPembelajaran || m.level,
          description: m.capaianPembelajaran || '',
          formulas: [],
          steps: []
        }));
        // Try to insert using the modern schema format
        const { error } = await supabase.from('materials').insert(modernPayload);
        if (error) {
          // If insert failed due to column mismatch (e.g. table still has the old structure)
          console.warn('Seeding new schema failed, trying old schema format fallback...');
          const oldFormatMaterials = SEED_MATERIALS.map(m => ({
            id: m.id,
            level: m.level,
            title: m.materiPembelajaran || m.level,
            description: m.capaianPembelajaran || '',
            formulas: [],
            steps: [],
            videoUrl: m.videoUrl || '',
            tutorialImages: m.tutorialImages || []
          }));
          const { error: fallbackError } = await supabase.from('materials').insert(oldFormatMaterials);
          if (fallbackError) {
            throw fallbackError;
          }
        }
      }
      setMaterials(SEED_MATERIALS);
      saveLocalData('materials', SEED_MATERIALS);
    } catch (err: any) {
      console.warn('Graceful fallback: Failed to seed materials to Supabase database. Using local copy:', err?.message || err);
      setMaterials(SEED_MATERIALS);
      saveLocalData('materials', SEED_MATERIALS);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- STUDENT WRITERS ---
  const addStudent = async (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    let uCode = '';
    do {
      uCode = Math.floor(10000 + Math.random() * 90000).toString();
    } while (students.some(s => s.uniqueCode === uCode));

    const newStudent: Student = {
      ...studentData,
      id: generateId(),
      createdAt: Date.now(),
      uniqueCode: uCode
    };

    const updated = [newStudent, ...students];
    setStudents(updated);
    saveLocalData('students', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('students').insert([newStudent]);
        if (error) {
          // If failure is due to missing columns in user's older database schema
          if (error.message && (error.message.includes('column') || error.code === 'PGRST204')) {
            console.warn('Supabase is missing new student columns. Retrying with legacy fields. Please run SQL setup script in Settings.', error);
            const legacyStudent = {
              id: newStudent.id,
              name: newStudent.name,
              parentName: newStudent.parentName,
              parentPhone: newStudent.parentPhone,
              joinDate: newStudent.joinDate,
              level: newStudent.level,
              status: newStudent.status,
              createdAt: newStudent.createdAt
            };
            const { error: retryError } = await supabase.from('students').insert([legacyStudent]);
            if (retryError) {
              console.warn('Retry with legacy fields failed:', retryError);
            } else {
              console.log('Successfully saved basic student info to Supabase (new columns missing, stored locally)');
            }
          } else {
            throw error;
          }
        }
      } catch (err) {
        console.warn('Failed to add student to Supabase (saved locally instead):', err);
      }
    }
  };

  const updateStudent = async (id: string, updatedFields: Partial<Student>) => {
    const updated = students.map(s => s.id === id ? { ...s, ...updatedFields } : s);
    setStudents(updated);
    saveLocalData('students', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('students').update(updatedFields).eq('id', id);
        if (error) {
          // If failure is due to missing columns in user's older database schema
          if (error.message && (error.message.includes('column') || error.code === 'PGRST204')) {
            console.warn('Supabase is missing updated student columns. Retrying with legacy fields. Please run SQL setup script in Settings.', error);
            const legacyFields: any = {};
            const allowedKeys: (keyof Student)[] = ['name', 'parentName', 'parentPhone', 'joinDate', 'level', 'status'];
            allowedKeys.forEach(key => {
              if (updatedFields[key] !== undefined) {
                legacyFields[key] = updatedFields[key];
              }
            });
            if (Object.keys(legacyFields).length > 0) {
              const { error: retryError } = await supabase.from('students').update(legacyFields).eq('id', id);
              if (retryError) {
                console.warn('Retry update with legacy fields failed:', retryError);
              } else {
                console.log('Successfully updated basic student info in Supabase (new columns missing, stored locally)');
              }
            }
          } else {
            throw error;
          }
        }
      } catch (err) {
        console.warn('Failed to update student in Supabase (saved locally instead):', err);
      }
    }
  };

  const deleteStudent = async (id: string) => {
    // Cascade delete associated records in local state & localStorage to prevent orphaned data
    const updatedStudents = students.filter(s => s.id !== id);
    setStudents(updatedStudents);
    saveLocalData('students', updatedStudents);

    const updatedAttendance = attendance.filter(a => a.studentId !== id);
    setAttendance(updatedAttendance);
    saveLocalData('attendance', updatedAttendance);

    const updatedNotes = notes.filter(n => n.studentId !== id);
    setNotes(updatedNotes);
    saveLocalData('notes', updatedNotes);

    const updatedInvoices = invoices.filter(i => i.studentId !== id);
    setInvoices(updatedInvoices);
    saveLocalData('invoices', updatedInvoices);

    const updatedGrades = grades.filter(g => g.studentId !== id);
    setGrades(updatedGrades);
    saveLocalData('grades', updatedGrades);

    if (supabase && !isOfflineFallback) {
      try {
        // Cascade delete child rows in Supabase first to prevent foreign key errors (ON DELETE CASCADE fallback)
        await supabase.from('attendance').delete().eq('studentId', id);
        await supabase.from('notes').delete().eq('studentId', id);
        await supabase.from('invoices').delete().eq('studentId', id);
        await supabase.from('grades').delete().eq('studentId', id);

        // Finally delete the parent student record
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete student in Supabase:', err);
      }
    }
  };

  // --- ATTENDANCE WRITERS ---
  const addAttendanceBatch = async (records: Omit<Attendance, 'id'>[]) => {
    const newRecords = records.map(r => ({
      ...r,
      id: generateId()
    }));

    // Filter out existing matching date+student to prevent duplicates in local state
    const filteredExisting = attendance.filter(
      a => !records.some(r => r.studentId === a.studentId && r.date === a.date)
    );
    const updated = [...newRecords, ...filteredExisting];
    setAttendance(updated);
    saveLocalData('attendance', updated);

    if (supabase && !isOfflineFallback) {
      try {
        // Upsert style: delete existing on matching studentId + date first, then insert
        for (const rec of records) {
          await supabase.from('attendance')
            .delete()
            .eq('studentId', rec.studentId)
            .eq('date', rec.date);
        }
        const { error } = await supabase.from('attendance').insert(newRecords);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to save attendance batch to Supabase:', err);
      }
    }
  };

  const deleteAttendanceByDate = async (date: string) => {
    const updated = attendance.filter(a => a.date !== date);
    setAttendance(updated);
    saveLocalData('attendance', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('attendance').delete().eq('date', date);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete attendance by date in Supabase:', err);
      }
    }
  };

  const deleteSingleAttendance = async (id: string) => {
    const updated = attendance.filter(a => a.id !== id);
    setAttendance(updated);
    saveLocalData('attendance', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('attendance').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete single attendance in Supabase:', err);
      }
    }
  };

  const updateSingleAttendance = async (id: string, updatedFields: Partial<Attendance>) => {
    const updated = attendance.map(a => a.id === id ? { ...a, ...updatedFields } : a);
    setAttendance(updated);
    saveLocalData('attendance', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('attendance').update(updatedFields).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to update attendance in Supabase:', err);
      }
    }
  };

  // --- TEACHER NOTE WRITERS ---
  const addTeacherNote = async (noteData: Omit<TeacherNote, 'id'>) => {
    const newNote = {
      ...noteData,
      id: generateId()
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    saveLocalData('notes', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('notes').insert([newNote]);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to save teacher note to Supabase:', err);
      }
    }
  };

  const addTeacherNotesBatch = async (notesData: Omit<TeacherNote, 'id'>[]) => {
    const newNotes = notesData.map(n => ({
      ...n,
      id: generateId()
    }));

    const updated = [...newNotes, ...notes];
    setNotes(updated);
    saveLocalData('notes', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('notes').insert(newNotes);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to save teacher notes batch to Supabase:', err);
      }
    }
  };

  const deleteTeacherNote = async (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveLocalData('notes', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete teacher note from Supabase:', err);
      }
    }
  };

  // --- INVOICE WRITERS ---
  const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>) => {
    const invoiceNo = generateInvoiceNo(settings.invoicePrefix || 'INV/MF');
    const newInvoice: Invoice = {
      ...invoiceData,
      id: generateId(),
      invoiceNo,
      createdAt: Date.now()
    };

    const updated = [newInvoice, ...invoices];
    setInvoices(updated);
    saveLocalData('invoices', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('invoices').insert([newInvoice]);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to create invoice in Supabase:', err);
      }
    }
  };

  const updateInvoiceStatus = async (id: string, status: 'paid' | 'unpaid' | 'partially_paid', details?: { paidAt?: string; paymentMethod?: 'Transfer' | 'Tunai'; amountPaid?: number; installments?: Installment[] }) => {
    const updated = invoices.map(inv => inv.id === id ? { ...inv, status, ...details } : inv);
    setInvoices(updated);
    saveLocalData('invoices', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const payload: any = { status };
        if (details?.paidAt !== undefined) payload.paidAt = details.paidAt;
        if (details?.paymentMethod !== undefined) payload.paymentMethod = details.paymentMethod;
        if (details?.amountPaid !== undefined) payload.amountPaid = details.amountPaid;
        if (details?.installments !== undefined) payload.installments = details.installments;
        const { error } = await supabase.from('invoices').update(payload).eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to update invoice status in Supabase:', err);
      }
    }
  };

  const deleteInvoice = async (id: string) => {
    const updated = invoices.filter(inv => inv.id !== id);
    setInvoices(updated);
    saveLocalData('invoices', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete invoice from Supabase:', err);
      }
    }
  };

  // --- GRADES WRITERS ---
  const addGrade = async (gradeData: Omit<Grade, 'id'>) => {
    const newGrade = {
      ...gradeData,
      id: generateId()
    };

    const updated = [newGrade, ...grades];
    setGrades(updated);
    saveLocalData('grades', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('grades').insert([newGrade]);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to save grade to Supabase:', err);
      }
    }
  };

  const deleteGrade = async (id: string) => {
    const updated = grades.filter(g => g.id !== id);
    setGrades(updated);
    saveLocalData('grades', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('grades').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete grade from Supabase:', err);
      }
    }
  };

  const updateGrade = async (updatedGrade: Grade) => {
    const updated = grades.map(g => g.id === updatedGrade.id ? updatedGrade : g);
    setGrades(updated);
    saveLocalData('grades', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('grades').update(updatedGrade).eq('id', updatedGrade.id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to update grade in Supabase:', err);
      }
    }
  };

  // --- MATERIAL WRITERS (FOR EXTRA SYLLABUS ADDS) ---
  const addMaterial = async (matData: Omit<LearningMaterial, 'id'>) => {
    const id = `mat-${Date.now()}`;
    const newMat = { ...matData, id };

    const updated = [...materials, newMat];
    setMaterials(updated);
    saveLocalData('materials', updated);

    if (supabase && !isOfflineFallback) {
      try {
        // Supply title & description as fallbacks for the old not-null constraints
        const insertPayload = {
          ...newMat,
          title: newMat.materiPembelajaran || newMat.level,
          description: newMat.capaianPembelajaran || '',
          formulas: [],
          steps: []
        };
        const { error } = await supabase.from('materials').insert([insertPayload]);
        if (error) {
          // Fallback if the table doesn't have the new columns at all
          console.warn('Inserting with new schema columns failed. Attempting insert with old schema fallback...');
          const fallbackPayload = {
            id: newMat.id,
            level: newMat.level,
            title: newMat.materiPembelajaran || newMat.level,
            description: newMat.capaianPembelajaran || '',
            formulas: [],
            steps: [],
            videoUrl: newMat.videoUrl || '',
            tutorialImages: newMat.tutorialImages || []
          };
          const { error: fallbackError } = await supabase.from('materials').insert([fallbackPayload]);
          if (fallbackError) throw fallbackError;
        }
      } catch (err) {
        console.error('Failed to add material to Supabase:', err);
      }
    }
  };

  const updateMaterial = async (id: string, updatedFields: Partial<LearningMaterial>) => {
    const updated = materials.map(m => m.id === id ? { ...m, ...updatedFields } : m);
    setMaterials(updated);
    saveLocalData('materials', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const updatePayload: any = { ...updatedFields };
        if (updatedFields.materiPembelajaran !== undefined || updatedFields.level !== undefined) {
          updatePayload.title = updatedFields.materiPembelajaran || updatedFields.level || '';
        }
        if (updatedFields.capaianPembelajaran !== undefined) {
          updatePayload.description = updatedFields.capaianPembelajaran || '';
        }
        const { error } = await supabase.from('materials').update(updatePayload).eq('id', id);
        if (error) {
          // Fallback if update fails due to non-existent columns (new schema not applied yet)
          console.warn('Updating with new schema columns failed. Attempting update with old schema fallback...');
          const fallbackPayload: any = {};
          if (updatedFields.level !== undefined) fallbackPayload.level = updatedFields.level;
          if (updatedFields.materiPembelajaran !== undefined || updatedFields.level !== undefined) {
            fallbackPayload.title = updatedFields.materiPembelajaran || updatedFields.level || '';
          }
          if (updatedFields.capaianPembelajaran !== undefined) {
            fallbackPayload.description = updatedFields.capaianPembelajaran || '';
          }
          if (updatedFields.videoUrl !== undefined) fallbackPayload.videoUrl = updatedFields.videoUrl;
          if (updatedFields.tutorialImages !== undefined) fallbackPayload.tutorialImages = updatedFields.tutorialImages;
          
          const { error: fallbackError } = await supabase.from('materials').update(fallbackPayload).eq('id', id);
          if (fallbackError) throw fallbackError;
        }
      } catch (err) {
        console.error('Failed to update material in Supabase:', err);
      }
    }
  };

  const deleteMaterial = async (id: string) => {
    const updated = materials.filter(m => m.id !== id);
    setMaterials(updated);
    saveLocalData('materials', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to delete material from Supabase:', err);
      }
    }
  };

  const clearAllMaterials = async () => {
    setMaterials([]);
    saveLocalData('materials', []);

    if (supabase && !isOfflineFallback) {
      try {
        // Deleting all rows by matching id not equal to empty string
        const { error } = await supabase.from('materials').delete().neq('id', '');
        if (error) throw error;
      } catch (err) {
        console.error('Failed to clear all materials from Supabase:', err);
      }
    }
  };

  // --- SETTINGS READERS & WRITERS ---
  const getBranchSettings = (branchName?: string): AppSettings => {
    if (!branchName || branchName === 'all' || branchName === 'Semua') {
      return allSettingsMap['Semua'] || allSettingsMap['default'] || settings;
    }
    const normalizedKey = branchName.toLowerCase().trim().replace(/\s+/g, '_');
    const match = allSettingsMap[branchName] || 
                  allSettingsMap[`branch_${normalizedKey}`] ||
                  allSettingsMap[normalizedKey];
    if (match) return match;
    return allSettingsMap['Semua'] || allSettingsMap['default'] || settings;
  };

  const updateSettings = async (newSettings: AppSettings, targetBranchName?: string) => {
    const branchName = newSettings.branch || targetBranchName || 'Semua';
    const isDefault = branchName === 'Semua' || branchName === 'all' || !branchName;
    const recordId = isDefault ? 'default' : `branch_${branchName.toLowerCase().trim().replace(/\s+/g, '_')}`;

    const updatedSetting: AppSettings = {
      ...newSettings,
      branch: branchName,
      branches: branchName
    };

    const updatedMap: Record<string, AppSettings> = {
      ...allSettingsMap,
      [branchName]: updatedSetting,
      [recordId]: updatedSetting
    };
    if (isDefault) {
      updatedMap['default'] = updatedSetting;
      updatedMap['Semua'] = updatedSetting;
    }

    setAllSettingsMap(updatedMap);
    saveLocalData('all_settings_map', updatedMap);
    setSettings(updatedSetting);
    saveLocalData('settings', updatedSetting);
    updateDynamicPwaIcon(updatedSetting.appIcon);

    if (supabase && !isOfflineFallback) {
      try {
        const payload = {
          id: recordId,
          branch: branchName,
          branches: branchName,
          bankName: updatedSetting.bankName,
          bankAccountNo: updatedSetting.bankAccountNo,
          bankAccountHolder: updatedSetting.bankAccountHolder,
          defaultSppAmount: Number(updatedSetting.defaultSppAmount),
          accentColor: updatedSetting.accentColor,
          defaultTeacherName: updatedSetting.defaultTeacherName,
          invoicePrefix: updatedSetting.invoicePrefix || 'INV/MF',
          invoiceLogo: updatedSetting.invoiceLogo || null,
          invoiceSignature: updatedSetting.invoiceSignature || null,
          appIcon: updatedSetting.appIcon || null,
          updatedAt: Date.now()
        };

        const { error } = await supabase.from('app_settings').upsert([payload]);
        if (error) {
          console.warn('Upsert with branch/branches column failed, trying fallback payload:', error.message);
          const fallbackPayload = {
            id: recordId,
            bankName: updatedSetting.bankName,
            bankAccountNo: updatedSetting.bankAccountNo,
            bankAccountHolder: updatedSetting.bankAccountHolder,
            defaultSppAmount: Number(updatedSetting.defaultSppAmount),
            accentColor: updatedSetting.accentColor,
            defaultTeacherName: updatedSetting.defaultTeacherName,
            invoicePrefix: updatedSetting.invoicePrefix || 'INV/MF',
            invoiceLogo: updatedSetting.invoiceLogo || null,
            invoiceSignature: updatedSetting.invoiceSignature || null,
            appIcon: updatedSetting.appIcon || null,
            updatedAt: Date.now()
          };
          const fbRes = await supabase.from('app_settings').upsert([fallbackPayload]);
          if (fbRes.error) {
            console.error('Failed to update app_settings in Supabase:', fbRes.error);
          }
        }
      } catch (e) {
        console.error('Error saving settings to Supabase:', e);
      }
    }
  };

  // --- DASHBOARD TASKS WRITERS ---
  const addDashboardTask = (text: string) => {
    const newTask: DashboardTask = {
      id: generateId(),
      text,
      completed: false,
      date: new Date().toISOString().slice(0, 10)
    };
    const updated = [...dashboardTasks, newTask];
    setDashboardTasks(updated);
    saveLocalData('dashboard_tasks', updated);
  };

  const toggleDashboardTask = (id: string) => {
    const updated = dashboardTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setDashboardTasks(updated);
    saveLocalData('dashboard_tasks', updated);
  };

  const deleteDashboardTask = (id: string) => {
    const updated = dashboardTasks.filter(t => t.id !== id);
    setDashboardTasks(updated);
    saveLocalData('dashboard_tasks', updated);
  };

  // --- BRANCH WRITERS ---
  const addBranch = async (branchData: Omit<Branch, 'id' | 'createdAt'>) => {
    const newBranch: Branch = {
      ...branchData,
      id: `br-${Date.now()}`,
      createdAt: Date.now()
    };
    const updated = [...branches, newBranch];
    setBranches(updated);
    saveLocalData('branches', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('branches').insert([newBranch]);
      } catch (e) {
        console.error('Failed to save branch to Supabase:', e);
      }
    }
  };

  const updateBranch = async (id: string, updatedFields: Partial<Branch>) => {
    const updated = branches.map(b => b.id === id ? { ...b, ...updatedFields } : b);
    setBranches(updated);
    saveLocalData('branches', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('branches').update(updatedFields).eq('id', id);
      } catch (e) {
        console.error('Failed to update branch in Supabase:', e);
      }
    }
  };

  const deleteBranch = async (id: string) => {
    const updated = branches.filter(b => b.id !== id);
    setBranches(updated);
    saveLocalData('branches', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('branches').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete branch in Supabase:', e);
      }
    }
  };

  // --- ADMIN USERS WRITERS ---
  const addAdminUser = async (userData: AdminUser) => {
    const updated = [...adminUsers, userData];
    setAdminUsers(updated);
    saveLocalData('admin_users', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('admin_users').insert([userData]);
      } catch (e) {
        console.error('Failed to save admin user to Supabase:', e);
      }
    }
  };

  const updateAdminUser = async (username: string, updatedFields: Partial<AdminUser>) => {
    const updated = adminUsers.map(u => u.username === username ? { ...u, ...updatedFields } : u);
    setAdminUsers(updated);
    saveLocalData('admin_users', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('admin_users').update(updatedFields).eq('username', username);
      } catch (e) {
        console.error('Failed to update admin user in Supabase:', e);
      }
    }
  };

  const deleteAdminUser = async (username: string) => {
    const updated = adminUsers.filter(u => u.username !== username);
    setAdminUsers(updated);
    saveLocalData('admin_users', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('admin_users').delete().eq('username', username);
      } catch (e) {
        console.error('Failed to delete admin user in Supabase:', e);
      }
    }
  };

  // --- CLASSES WRITERS ---
  const addClassGroup = async (classData: Omit<ClassGroup, 'id' | 'createdAt'>) => {
    const newClass: ClassGroup = {
      ...classData,
      id: `cls-${generateId()}`,
      createdAt: Date.now()
    };
    const updated = [newClass, ...classes];
    setClasses(updated);
    saveLocalData('classes', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('classes').insert([newClass]);
      } catch (e) {
        console.error('Failed to save class to Supabase:', e);
      }
    }
  };

  const updateClassGroup = async (id: string, updatedFields: Partial<ClassGroup>) => {
    const updated = classes.map(c => c.id === id ? { ...c, ...updatedFields } : c);
    setClasses(updated);
    saveLocalData('classes', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('classes').update(updatedFields).eq('id', id);
      } catch (e) {
        console.error('Failed to update class in Supabase:', e);
      }
    }
  };

  const deleteClassGroup = async (id: string) => {
    const updated = classes.filter(c => c.id !== id);
    setClasses(updated);
    saveLocalData('classes', updated);

    if (supabase && !isOfflineFallback) {
      try {
        await supabase.from('classes').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete class in Supabase:', e);
      }
    }
  };

  // --- MANUAL BACKUP IMPORT WRITER ---
  const importBackupData = async (backupPayload: any) => {
    try {
      const data = backupPayload?.data || backupPayload;
      if (!data) throw new Error('Data cadangan tidak valid');

      const importedStudents = Array.isArray(data.students) ? data.students : null;
      const importedGrades = Array.isArray(data.grades) ? data.grades : null;
      const importedAttendance = Array.isArray(data.attendance) ? data.attendance : null;
      const importedNotes = Array.isArray(data.notes) ? data.notes : null;
      const importedInvoices = Array.isArray(data.invoices) ? data.invoices : null;
      const importedTasks = Array.isArray(data.dashboardTasks) ? data.dashboardTasks : null;
      const importedBranches = Array.isArray(data.branches) ? data.branches : null;
      const importedAdminUsers = Array.isArray(data.adminUsers || data.admin_users) ? (data.adminUsers || data.admin_users) : null;
      const importedClasses = Array.isArray(data.classes) ? data.classes : null;
      const importedSettings = data.settings;

      if (!importedStudents && !importedGrades && !importedAttendance && !importedNotes && !importedInvoices) {
        throw new Error('Data tidak ditemukan dalam file cadangan');
      }

      // 1. Settings
      if (importedSettings) {
        setSettings(importedSettings);
        saveLocalData('settings', importedSettings);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('app_settings').upsert([{
              id: 'default',
              bankName: importedSettings.bankName,
              bankAccountNo: importedSettings.bankAccountNo,
              bankAccountHolder: importedSettings.bankAccountHolder,
              defaultSppAmount: importedSettings.defaultSppAmount,
              accentColor: importedSettings.accentColor,
              defaultTeacherName: importedSettings.defaultTeacherName,
              invoicePrefix: importedSettings.invoicePrefix || 'INV/MF',
              invoiceLogo: importedSettings.invoiceLogo || null,
              invoiceSignature: importedSettings.invoiceSignature || null,
              updatedAt: Date.now()
            }]);
          } catch (e) {
            console.warn('Failed to sync settings to Supabase during backup restore:', e);
          }
        }
      }

      // 2. Students
      if (importedStudents) {
        setStudents(importedStudents);
        saveLocalData('students', importedStudents);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('students').upsert(importedStudents);
          } catch (e) {
            console.warn('Failed to sync students to Supabase during backup restore:', e);
          }
        }
      }

      // 3. Grades
      if (importedGrades) {
        setGrades(importedGrades);
        saveLocalData('grades', importedGrades);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('grades').upsert(importedGrades);
          } catch (e) {
            console.warn('Failed to sync grades to Supabase during backup restore:', e);
          }
        }
      }

      // 4. Attendance
      if (importedAttendance) {
        setAttendance(importedAttendance);
        saveLocalData('attendance', importedAttendance);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('attendance').upsert(importedAttendance);
          } catch (e) {
            console.warn('Failed to sync attendance to Supabase during backup restore:', e);
          }
        }
      }

      // 5. Notes
      if (importedNotes) {
        setNotes(importedNotes);
        saveLocalData('notes', importedNotes);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('notes').upsert(importedNotes);
          } catch (e) {
            console.warn('Failed to sync notes to Supabase during backup restore:', e);
          }
        }
      }

      // 6. Invoices
      if (importedInvoices) {
        setInvoices(importedInvoices);
        saveLocalData('invoices', importedInvoices);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('invoices').upsert(importedInvoices);
          } catch (e) {
            console.warn('Failed to sync invoices to Supabase during backup restore:', e);
          }
        }
      }

      // 7. Dashboard Tasks
      if (importedTasks) {
        setDashboardTasks(importedTasks);
        saveLocalData('dashboard_tasks', importedTasks);
      }

      // 8. Branches
      if (importedBranches) {
        setBranches(importedBranches);
        saveLocalData('branches', importedBranches);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('branches').upsert(importedBranches);
          } catch (e) {
            console.warn('Failed to sync branches to Supabase during backup restore:', e);
          }
        }
      }

      // 9. Admin Users
      if (importedAdminUsers) {
        setAdminUsers(importedAdminUsers);
        saveLocalData('admin_users', importedAdminUsers);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('admin_users').upsert(importedAdminUsers);
          } catch (e) {
            console.warn('Failed to sync admin users to Supabase during backup restore:', e);
          }
        }
      }

      // 10. Classes
      if (importedClasses) {
        setClasses(importedClasses);
        saveLocalData('classes', importedClasses);
        if (supabase && !isOfflineFallback) {
          try {
            await supabase.from('classes').upsert(importedClasses);
          } catch (e) {
            console.warn('Failed to sync classes to Supabase during backup restore:', e);
          }
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Failed to import backup:', err);
      return { success: false, error: err.message || 'Gagal memproses file cadangan' };
    }
  };

  return {
    students,
    attendance,
    notes,
    invoices,
    grades,
    materials,
    branches,
    adminUsers,
    classes,
    settings,
    allSettingsMap,
    getBranchSettings,
    dashboardTasks,
    loading,
    isOfflineFallback,
    addStudent,
    updateStudent,
    deleteStudent,
    addAttendanceBatch,
    deleteAttendanceByDate,
    deleteSingleAttendance,
    updateSingleAttendance,
    addTeacherNote,
    addTeacherNotesBatch,
    deleteTeacherNote,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    addGrade,
    deleteGrade,
    updateGrade,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    clearAllMaterials,
    updateSettings,
    addDashboardTask,
    toggleDashboardTask,
    deleteDashboardTask,
    addBranch,
    updateBranch,
    deleteBranch,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    addClassGroup,
    updateClassGroup,
    deleteClassGroup,
    importBackupData
  };
}
