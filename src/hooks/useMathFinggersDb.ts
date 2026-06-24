import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Student, Attendance, TeacherNote, Invoice, Grade, LearningMaterial, AppSettings, DashboardTask } from '../types';
import { SEED_MATERIALS, generateInvoiceNo } from '../utils';

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
    localStorage.setItem(`math_finggers_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

export function useMathFinggersDb() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    return getLocalData<AppSettings>('settings', {
      bankName: 'Bank BCA',
      bankAccountNo: '1234567890',
      bankAccountHolder: 'Admin Math Fingers',
      defaultSppAmount: 250000,
      accentColor: 'emerald',
      defaultTeacherName: 'Admin Math Fingers'
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

      // Set state and save locally for offline capabilities
      const loadedStudents = studentsData || [];
      const loadedAttendance = (attendanceData || []).sort((a, b) => b.date.localeCompare(a.date));
      const loadedNotes = (notesData || []).sort((a, b) => b.date.localeCompare(a.date));
      const loadedInvoices = invoicesData || [];
      const loadedGrades = (gradesData || []).sort((a, b) => b.date.localeCompare(a.date));

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

      if (!materialsData || materialsData.length === 0) {
        // Seed default materials to Supabase
        await seedDefaultMaterialsToSupabase();
      } else {
        setMaterials(materialsData);
        saveLocalData('materials', materialsData);
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
    setStudents(getLocalData<Student[]>('students', []));
    setAttendance(getLocalData<Attendance[]>('attendance', []));
    setNotes(getLocalData<TeacherNote[]>('notes', []));
    setInvoices(getLocalData<Invoice[]>('invoices', []));
    setGrades(getLocalData<Grade[]>('grades', []));
    
    const localMats = getLocalData<LearningMaterial[]>('materials', []);
    if (localMats.length === 0) {
      saveLocalData('materials', SEED_MATERIALS);
      setMaterials(SEED_MATERIALS);
    } else {
      setMaterials(localMats);
    }
  };

  const seedDefaultMaterialsToSupabase = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('materials').insert(SEED_MATERIALS);
      if (error) throw error;
      setMaterials(SEED_MATERIALS);
      saveLocalData('materials', SEED_MATERIALS);
    } catch (err) {
      console.error('Failed to seed materials directly to Supabase:', err);
      setMaterials(SEED_MATERIALS);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- STUDENT WRITERS ---
  const addStudent = async (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    const newStudent: Student = {
      ...studentData,
      id: generateId(),
      createdAt: Date.now()
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
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);
    saveLocalData('students', updated);

    if (supabase && !isOfflineFallback) {
      try {
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
    const invoiceNo = generateInvoiceNo();
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

  const updateInvoiceStatus = async (id: string, status: 'paid' | 'unpaid', details?: { paidAt: string; paymentMethod: 'Transfer' | 'Tunai' }) => {
    const updated = invoices.map(inv => inv.id === id ? { ...inv, status, ...details } : inv);
    setInvoices(updated);
    saveLocalData('invoices', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('invoices').update({ status, ...(details || {}) }).eq('id', id);
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

  // --- MATERIAL WRITERS (FOR EXTRA SYLLABUS ADDS) ---
  const addMaterial = async (matData: Omit<LearningMaterial, 'id'>) => {
    const id = `mat-${Date.now()}`;
    const newMat = { ...matData, id };

    const updated = [...materials, newMat];
    setMaterials(updated);
    saveLocalData('materials', updated);

    if (supabase && !isOfflineFallback) {
      try {
        const { error } = await supabase.from('materials').insert([newMat]);
        if (error) throw error;
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
        const { error } = await supabase.from('materials').update(updatedFields).eq('id', id);
        if (error) throw error;
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

  // --- SETTINGS WRITERS ---
  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveLocalData('settings', newSettings);
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

  return {
    students,
    attendance,
    notes,
    invoices,
    grades,
    materials,
    settings,
    dashboardTasks,
    loading,
    isOfflineFallback,
    addStudent,
    updateStudent,
    deleteStudent,
    addAttendanceBatch,
    addTeacherNote,
    deleteTeacherNote,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    addGrade,
    deleteGrade,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    updateSettings,
    addDashboardTask,
    toggleDashboardTask,
    deleteDashboardTask
  };
}
