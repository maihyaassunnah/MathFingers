/**
 * Google Sheets Realtime Database Integration Service
 * 
 * Mengelola sinkronisasi dua arah antara aplikasi Math Fingers dan Google Sheets.
 * - Membaca & menulis data langsung via Google Sheets API v4
 * - Membuat Spreadsheet Master otomatis jika belum ada di Google Drive pengguna
 * - Format sheet standar: Siswa, Kelas, Absensi, Jurnal, SPP, Nilai, Keuangan, Cabang, Admin
 */

import { Student, Attendance, TeacherNote, Invoice, Grade, Branch, AdminUser, ClassGroup, FinanceIncome, FinanceExpense, StudentBehaviorAssessment } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  autoSyncEnabled: boolean;
  isPermanent?: boolean;
  customClientId?: string;
  lastSyncedAt?: string;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

const STORAGE_CONFIG_KEY = 'math_finggers_google_sheets_config';
const OAUTH_TOKEN_KEY = 'math_finggers_google_oauth_token';
const CUSTOM_CLIENT_ID_KEY = 'math_finggers_google_client_id';

export const SHEET_NAMES = {
  STUDENTS: 'Data_Siswa',
  CLASSES: 'Data_Kelas',
  ATTENDANCE: 'Presensi_Siswa',
  NOTES: 'Jurnal_Guru',
  INVOICES: 'Keuangan_SPP',
  GRADES: 'Nilai_Evaluasi',
  BEHAVIOR: 'Karakter_Fokus',
  INCOMES: 'Pemasukan_Lain',
  EXPENSES: 'Pengeluaran_Kas',
  BRANCHES: 'Daftar_Cabang',
  ADMINS: 'Akun_Pengelola'
};

// Header definitions for each sheet tab
export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.STUDENTS]: [
    'ID', 'Nama Siswa', 'Nama Wali', 'No. WhatsApp', 'Tanggal Masuk', 'Level', 
    'Status', 'Keterangan', 'Tempat Lahir', 'Tanggal Lahir', 'Jenis Paket', 
    'Jenis Kelamin', 'Alamat', 'Cabang', 'Hari Les', 'Kode Unik', 'Kelas', 'CreatedAt'
  ],
  [SHEET_NAMES.CLASSES]: [
    'ID', 'Nama Kelas', 'Hari Belajar', 'Jam Belajar', 'Guru Pengajar', 
    'Kuota', 'Ruang', 'Level', 'Cabang', 'CreatedAt'
  ],
  [SHEET_NAMES.ATTENDANCE]: [
    'ID', 'ID Siswa', 'Nama Siswa', 'Tanggal', 'Status Kehadiran', 'Catatan', 'Cabang'
  ],
  [SHEET_NAMES.NOTES]: [
    'ID', 'ID Siswa', 'Nama Siswa', 'Tanggal', 'Topik Materi', 'Catatan Jurnal', 'Guru Pengajar', 'Cabang'
  ],
  [SHEET_NAMES.INVOICES]: [
    'ID', 'No. Invoice', 'ID Siswa', 'Nama Siswa', 'Total Tagihan', 'Bulan Tagihan', 
    'Jatuh Tempo', 'Status Pembayaran', 'Tanggal Bayar', 'Metode Bayar', 
    'Jumlah Terbayar', 'Kategori', 'Cabang', 'CreatedAt'
  ],
  [SHEET_NAMES.GRADES]: [
    'ID', 'ID Siswa', 'Nama Siswa', 'Tanggal Kuis', 'Topik/Level', 'Skor (0-100)', 
    'Kecepatan (Detik)', 'Catatan Refleks', 'Cabang'
  ],
  [SHEET_NAMES.BEHAVIOR]: [
    'ID', 'ID Siswa', 'Nama Siswa', 'Tanggal', 'Topik', 'Fokus', 'Partisipasi', 'Sikap Keaktifan', 'Catatan Karakter', 'Guru', 'Cabang', 'CreatedAt'
  ],
  [SHEET_NAMES.INCOMES]: [
    'ID', 'Tanggal', 'Kategori', 'Nominal (Rp)', 'Sumber Dana', 'Keterangan', 'Invoice ID', 'Cabang', 'CreatedAt'
  ],
  [SHEET_NAMES.EXPENSES]: [
    'ID', 'Tanggal', 'Kategori', 'Nominal (Rp)', 'Penerima', 'Metode Pembayaran', 'Keterangan', 'Cabang', 'CreatedAt'
  ],
  [SHEET_NAMES.BRANCHES]: [
    'ID', 'Nama Cabang', 'Alamat', 'No. Kontak', 'CreatedAt'
  ],
  [SHEET_NAMES.ADMINS]: [
    'Username', 'Nama Lengkap', 'Role', 'Cabang', 'Email', 'CreatedAt'
  ]
};

class GoogleSheetsService {
  private config: GoogleSheetsConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private tokenClient: any = null;

  private subscribers: Array<(status: 'idle' | 'syncing' | 'success' | 'error', config: GoogleSheetsConfig | null, error?: string) => void> = [];
  private debounceTimer: any = null;
  private isPushing: boolean = false;
  private pendingPushData: any = null;

  constructor() {
    this.loadConfig();
    this.loadSavedToken();
  }

  public subscribe(callback: (status: 'idle' | 'syncing' | 'success' | 'error', config: GoogleSheetsConfig | null, error?: string) => void): () => void {
    this.subscribers.push(callback);
    // Langsung kabari subscriber dengan status saat ini
    callback(this.config?.syncStatus || 'idle', this.config);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers(status: 'idle' | 'syncing' | 'success' | 'error', error?: string) {
    if (this.config) {
      this.config.syncStatus = status;
      if (error) this.config.errorMessage = error;
      this.saveConfig(this.config);
    }
    this.subscribers.forEach(cb => {
      try {
        cb(status, this.config, error);
      } catch (e) {
        console.warn('Error in Google Sheets subscriber:', e);
      }
    });
  }

  public isAutoSyncActive(): boolean {
    return !!(this.config && this.config.spreadsheetId && this.config.autoSyncEnabled !== false);
  }

  /**
   * Pemicu Debounced Auto-Sync:
   * Setiap kali ada input data baru di aplikasi, fungsi ini dipanggil.
   * Menunggu jeda pendek (1500ms) untuk mengumpulkan perubahan lalu otomatis mengirim ke Google Sheets.
   */
  public triggerAutoSync(data: {
    students?: Student[];
    classes?: ClassGroup[];
    attendance?: Attendance[];
    notes?: TeacherNote[];
    invoices?: Invoice[];
    grades?: Grade[];
    behaviorAssessments?: StudentBehaviorAssessment[];
    manualIncomes?: FinanceIncome[];
    expenses?: FinanceExpense[];
    branches?: Branch[];
    adminUsers?: AdminUser[];
  }, delayMs: number = 1500) {
    if (!this.isAutoSyncActive()) return;

    this.pendingPushData = data;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      if (!this.pendingPushData) return;
      const dataToPush = this.pendingPushData;
      this.pendingPushData = null;

      // Jika tidak ada token yang valid, jangan buat popup otomatis agar tidak mengganggu ketikan pengguna
      if (!this.hasValidToken()) {
        console.info('Google Sheets Auto-Sync: Menunggu otorisasi Google aktif.');
        return;
      }

      try {
        if (this.isPushing) {
          // Jadwalkan ulang jika sedang ada push aktif
          this.pendingPushData = dataToPush;
          return;
        }

        this.isPushing = true;
        this.notifySubscribers('syncing');

        await this.pushAllDataToSpreadsheet(dataToPush, this.config!.spreadsheetId);

        this.notifySubscribers('success');
      } catch (err: any) {
        console.warn('Google Sheets Auto-Sync background push warning:', err?.message || err);
        this.notifySubscribers('error', err?.message || 'Gagal sinkron otomatis');
      } finally {
        this.isPushing = false;
        // Jika ada data baru yang masuk saat proses push tadi
        if (this.pendingPushData) {
          this.triggerAutoSync(this.pendingPushData, 500);
        }
      }
    }, delayMs);
  }

  // Muat konfigurasi spreadsheet tersimpan dari localStorage
  public loadConfig(): GoogleSheetsConfig | null {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Gagal membaca konfigurasi Google Sheets lokal:', e);
    }
    return this.config;
  }

  // Simpan konfigurasi (otomatis dikunci permanen)
  public saveConfig(config: GoogleSheetsConfig) {
    // Otomatis tandai sebagai permanen & terkunci
    const permanentConfig: GoogleSheetsConfig = {
      ...config,
      isPermanent: true
    };
    this.config = permanentConfig;
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(permanentConfig));
  }

  // Pengaturan Custom Google OAuth Client ID (untuk domain custom seperti mathfingers.my.id)
  public getCustomClientId(): string {
    return this.config?.customClientId || localStorage.getItem(CUSTOM_CLIENT_ID_KEY) || '';
  }

  public setCustomClientId(clientId: string) {
    const trimmed = clientId.trim();
    if (trimmed) {
      localStorage.setItem(CUSTOM_CLIENT_ID_KEY, trimmed);
    } else {
      localStorage.removeItem(CUSTOM_CLIENT_ID_KEY);
    }
    if (this.config) {
      this.config.customClientId = trimmed || undefined;
      this.saveConfig(this.config);
    }
  }

  public getEffectiveClientId(): string {
    const custom = this.getCustomClientId();
    if (custom) return custom;
    return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || '566740632732-e4isns6dpiamjvv48p6jsnq7jdt8rvse.apps.googleusercontent.com';
  }

  // Hapus konfigurasi
  public clearConfig(force: boolean = false) {
    if (this.config?.isPermanent && !force) {
      console.warn('Google Sheets config is locked permanently.');
      return;
    }
    this.config = null;
    localStorage.removeItem(STORAGE_CONFIG_KEY);
  }

  // Token management
  private loadSavedToken() {
    try {
      const raw = localStorage.getItem(OAUTH_TOKEN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.token && parsed.expiresAt > Date.now() + 60000) {
          this.accessToken = parsed.token;
          this.tokenExpiresAt = parsed.expiresAt;
        }
      }
    } catch {
      // Ignored
    }
  }

  public setAccessToken(token: string, expiresInSeconds: number = 3600) {
    const cleanToken = token.trim();
    this.accessToken = cleanToken;
    this.tokenExpiresAt = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem(OAUTH_TOKEN_KEY, JSON.stringify({
      token: cleanToken,
      expiresAt: this.tokenExpiresAt
    }));
    this.notifySubscribers('idle');
  }

  public getAccessToken(): string | null {
    if (this.accessToken && this.tokenExpiresAt > Date.now()) {
      return this.accessToken;
    }
    return null;
  }

  public hasValidToken(): boolean {
    return !!this.getAccessToken();
  }

  // Request Access Token via Google Identity Services (GIS)
  public async requestOAuthToken(): Promise<string> {
    const existing = this.getAccessToken();
    if (existing) return existing;

    return new Promise((resolve, reject) => {
      // Periksa apakah Google Identity Services tersedia di window
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services library belum dimuat. Silakan muat ulang halaman atau periksa koneksi internet Anda.'));
        return;
      }

      const effectiveClientId = this.getEffectiveClientId();
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'domain aplikasi';
      
      const client = google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            const errDesc = response.error_description || response.error || '';
            if (errDesc.includes('popup_closed') || errDesc.includes('closed') || response.error === 'popup_closed_by_user') {
              reject(new Error('Jendela popup Google ditutup. Silakan klik kembali untuk mengizinkan akses.'));
            } else if (errDesc.includes('origin_mismatch') || errDesc.includes('400')) {
              reject(new Error(`Otorisasi Google Ditolak (Error origin_mismatch). Domain Anda (${currentOrigin}) belum didaftarkan di Authorized JavaScript Origins pada Google Cloud Console untuk Client ID (${effectiveClientId}). Masukkan Google Client ID domain Anda di pengaturan atau tempelkan Access Token secara langsung.`));
            } else {
              reject(new Error(errDesc));
            }
            return;
          }
          if (response.access_token) {
            this.setAccessToken(response.access_token, response.expires_in || 3600);
            resolve(response.access_token);
          } else {
            reject(new Error('Gagal mendapatkan access token Google.'));
          }
        },
        error_callback: (err: any) => {
          const msg = err?.message || String(err || '');
          if (msg.includes('popup_closed') || msg.includes('Popup window closed') || msg.includes('closed')) {
            reject(new Error('Jendela popup Google ditutup. Silakan klik kembali jika ingin melanjutkan.'));
          } else if (msg.includes('origin_mismatch')) {
            reject(new Error(`Otorisasi Google Ditolak (Error origin_mismatch). Domain Anda (${currentOrigin}) belum terdaftar di Authorized JavaScript Origins Google Cloud Console. Silakan masukkan Google Client ID domain Anda atau tempel Access Token.`));
          } else {
            reject(new Error(msg || 'Autentikasi Google dibatalkan atau ditolak.'));
          }
        }
      });

      try {
        client.requestAccessToken({ prompt: '' });
      } catch (reqErr: any) {
        reject(new Error(reqErr?.message || 'Gagal membuka jendela otorisasi Google.'));
      }
    });
  }

  public clearOAuthToken() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    try {
      localStorage.removeItem(OAUTH_TOKEN_KEY);
    } catch {
      // Ignored
    }
  }

  // -------------------------------------------------------------
  // GOOGLE SHEETS API OPERATIONS
  // -------------------------------------------------------------

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getAccessToken();
    if (!token) {
      token = await this.requestOAuthToken();
    }

    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Token kedaluwarsa, minta ulang
      this.clearOAuthToken();
      token = await this.requestOAuthToken();
      const retryHeaders = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      return fetch(url, { ...options, headers: retryHeaders });
    }
    return res;
  }

  /**
   * Mengambil metadata spreadsheet (judul & daftar sheet tab yang ada)
   */
  public async getSpreadsheetMetadata(spreadsheetId: string): Promise<{
    title: string;
    existingSheets: string[];
  }> {
    const response = await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title,sheets.properties.sheetId`
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Gagal mengakses spreadsheet. Pastikan link / ID benar dan akun Google Anda memiliki akses.');
    }

    const data = await response.json();
    const existingSheets: string[] = (data.sheets || []).map((s: any) => s.properties?.title || '').filter(Boolean);
    return {
      title: data.properties?.title || 'Math Fingers Database',
      existingSheets
    };
  }

  /**
   * Memastikan seluruh 11 tab sheet standar Math Fingers ada di dalam spreadsheet.
   * Jika ada tab yang belum dibuat, fungsi ini akan otomatis menambahkannya (addSheet) dan mengisi baris Header kolom.
   */
  public async ensureSpreadsheetStructure(spreadsheetId: string): Promise<string[]> {
    const { existingSheets } = await this.getSpreadsheetMetadata(spreadsheetId);
    const requiredSheets = Object.keys(SHEET_HEADERS);
    const missingSheets = requiredSheets.filter(title => !existingSheets.includes(title));

    if (missingSheets.length > 0) {
      // 1. Tambah sheet tab yang kurang
      const addSheetRequests = missingSheets.map(title => ({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
              frozenRowCount: 1
            }
          }
        }
      }));

      const addResponse = await this.fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({ requests: addSheetRequests })
        }
      );

      if (!addResponse.ok) {
        const err = await addResponse.json().catch(() => ({}));
        console.warn('Gagal menambahkan tab sheet otomatis:', err);
      }

      // 2. Tulis baris Header di baris 1 untuk tab baru
      const headerBatch = missingSheets.map(title => ({
        range: `'${title}'!A1:${this.getColumnLetter(SHEET_HEADERS[title].length)}1`,
        values: [SHEET_HEADERS[title]]
      }));

      await this.fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: headerBatch
          })
        }
      );
    }

    return [...existingSheets, ...missingSheets];
  }

  /**
   * Membuat Google Spreadsheet Master Baru di Google Drive pengguna
   * dengan seluruh tab sheet dan header kolom otomatis siap pakai.
   */
  public async createMasterSpreadsheet(title: string = 'Database Master Math Fingers'): Promise<GoogleSheetsConfig> {
    const sheetsToCreate = Object.entries(SHEET_HEADERS).map(([sheetTitle]) => ({
      properties: {
        title: sheetTitle,
        gridProperties: {
          rowCount: 1000,
          columnCount: 26,
          frozenRowCount: 1
        }
      }
    }));

    const createPayload = {
      properties: {
        title: `${title} - ${new Date().toLocaleDateString('id-ID')}`
      },
      sheets: sheetsToCreate
    };

    const response = await this.fetchWithAuth('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      body: JSON.stringify(createPayload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Gagal membuat Google Spreadsheet baru.');
    }

    const result = await response.json();
    const spreadsheetId = result.spreadsheetId;
    const spreadsheetUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Inisialisasi Header Baris Pertama pada setiap Sheet
    const dataBatch: any[] = [];
    Object.entries(SHEET_HEADERS).forEach(([sheetTitle, headers]) => {
      dataBatch.push({
        range: `'${sheetTitle}'!A1:${this.getColumnLetter(headers.length)}1`,
        values: [headers]
      });
    });

    await this.fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataBatch
      })
    });

    const newConfig: GoogleSheetsConfig = {
      spreadsheetId,
      spreadsheetUrl,
      spreadsheetTitle: result.properties?.title || title,
      autoSyncEnabled: true,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'success'
    };

    this.saveConfig(newConfig);
    return newConfig;
  }

  /**
   * Membaca seluruh data dari Google Spreadsheet (Tarik Data ke Aplikasi)
   */
  public async pullAllDataFromSpreadsheet(spreadsheetId?: string): Promise<{
    students: Student[];
    classes: ClassGroup[];
    attendance: Attendance[];
    notes: TeacherNote[];
    invoices: Invoice[];
    grades: Grade[];
    behaviorAssessments: StudentBehaviorAssessment[];
    manualIncomes: FinanceIncome[];
    expenses: FinanceExpense[];
    branches: Branch[];
    adminUsers: AdminUser[];
  }> {
    const targetId = spreadsheetId || this.config?.spreadsheetId;
    if (!targetId) {
      throw new Error('ID Spreadsheet belum dikonfigurasi.');
    }

    // Pastikan struktur tab sheet ada di spreadsheet tujuan
    const activeSheets = await this.ensureSpreadsheetStructure(targetId);

    // Bangun range hanya untuk sheet yang valid dan ada di spreadsheet
    const availableSheets = Object.keys(SHEET_HEADERS).filter(name => activeSheets.includes(name));
    
    if (availableSheets.length === 0) {
      return {
        students: [],
        classes: [],
        attendance: [],
        notes: [],
        invoices: [],
        grades: [],
        behaviorAssessments: [],
        manualIncomes: [],
        expenses: [],
        branches: [],
        adminUsers: []
      };
    }

    const ranges = availableSheets.map(name => `'${name}'!A2:Z5000`);
    const rangeParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');

    const response = await this.fetchWithAuth(
      `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values:batchGet?${rangeParams}&majorDimension=ROWS`
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Gagal mengambil data dari Google Spreadsheet.');
    }

    const json = await response.json();
    const valueRanges = json.valueRanges || [];

    const getRowsForSheet = (sheetName: string): any[][] => {
      const found = valueRanges.find((vr: any) => {
        if (!vr.range) return false;
        const cleanRange = vr.range.replace(/'/g, '');
        return cleanRange.startsWith(`${sheetName}!`) || cleanRange.startsWith(sheetName);
      });
      return found?.values || [];
    };

    // 1. Parse Students
    const studentRows = getRowsForSheet(SHEET_NAMES.STUDENTS);
    const students: Student[] = studentRows.map((r) => ({
      id: r[0] || '',
      name: r[1] || '',
      parentName: r[2] || '',
      parentPhone: r[3] || '',
      joinDate: r[4] || new Date().toISOString().split('T')[0],
      level: r[5] || 'Level 1: Basic',
      status: (r[6] === 'alumni' || r[6] === 'inactive') ? r[6] : 'active',
      keterangan: r[7] || '',
      tempatLahir: r[8] || '',
      tanggalLahir: r[9] || '',
      jenisPaket: r[10] || '8P',
      jenisKelamin: r[11] as any || 'Laki-laki',
      alamat: r[12] || '',
      branch: r[13] || 'Pusat',
      hariLes: r[14] || '',
      uniqueCode: r[15] || '',
      kelas: r[16] || '',
      createdAt: Number(r[17]) || Date.now()
    })).filter(s => s.id && s.name);

    // 2. Parse Classes
    const classRows = getRowsForSheet(SHEET_NAMES.CLASSES);
    const classes: ClassGroup[] = classRows.map(r => ({
      id: r[0] || '',
      name: r[1] || '',
      scheduleDays: r[2] || '',
      scheduleTime: r[3] || '',
      teacherName: r[4] || '',
      quota: Number(r[5]) || 15,
      room: r[6] || '',
      level: r[7] || '',
      branch: r[8] || 'Pusat',
      createdAt: Number(r[9]) || Date.now()
    })).filter(c => c.id && c.name);

    // 3. Parse Attendance
    const attRows = getRowsForSheet(SHEET_NAMES.ATTENDANCE);
    const attendance: Attendance[] = attRows.map(r => ({
      id: r[0] || '',
      studentId: r[1] || '',
      studentName: r[2] || '',
      date: r[3] || '',
      status: (r[4] === 'absent' || r[4] === 'permission') ? r[4] : 'present',
      notes: r[5] || '',
      branch: r[6] || 'Pusat'
    })).filter(a => a.id && a.studentId);

    // 4. Parse Notes
    const noteRows = getRowsForSheet(SHEET_NAMES.NOTES);
    const notes: TeacherNote[] = noteRows.map(r => ({
      id: r[0] || '',
      studentId: r[1] || '',
      studentName: r[2] || '',
      date: r[3] || '',
      topic: r[4] || '',
      content: r[5] || '',
      teacherName: r[6] || '',
      branch: r[7] || 'Pusat'
    })).filter(n => n.id && n.studentId);

    // 5. Parse Invoices
    const invoiceRows = getRowsForSheet(SHEET_NAMES.INVOICES);
    const invoices: Invoice[] = invoiceRows.map(r => ({
      id: r[0] || '',
      invoiceNo: r[1] || '',
      studentId: r[2] || '',
      studentName: r[3] || '',
      amount: Number(r[4]) || 0,
      month: r[5] || '',
      dueDate: r[6] || '',
      status: (r[7] === 'paid' || r[7] === 'partially_paid') ? r[7] : 'unpaid',
      paidAt: r[8] || undefined,
      paymentMethod: r[9] as any || 'Transfer',
      amountPaid: Number(r[10]) || 0,
      category: (r[11] as any) || 'spp',
      branch: r[12] || 'Pusat',
      createdAt: Number(r[13]) || Date.now()
    })).filter(i => i.id && i.invoiceNo);

    // 6. Parse Grades
    const gradeRows = getRowsForSheet(SHEET_NAMES.GRADES);
    const grades: Grade[] = gradeRows.map(r => ({
      id: r[0] || '',
      studentId: r[1] || '',
      studentName: r[2] || '',
      date: r[3] || '',
      topic: r[4] || '',
      score: Number(r[5]) || 0,
      speedSeconds: Number(r[6]) || 0,
      notes: r[7] || '',
      branch: r[8] || 'Pusat'
    })).filter(g => g.id && g.studentId);

    // 7. Parse Behavior
    const behaviorRows = getRowsForSheet(SHEET_NAMES.BEHAVIOR);
    const behaviorAssessments: StudentBehaviorAssessment[] = behaviorRows.map(r => ({
      id: r[0] || '',
      studentId: r[1] || '',
      studentName: r[2] || '',
      date: r[3] || '',
      topic: r[4] || '',
      fokus: (r[5] as any) || 'A',
      partisipasi: (r[6] as any) || 'A',
      sikapKeaktifan: (r[7] as any) || 'A',
      notes: r[8] || '',
      teacherName: r[9] || '',
      branch: r[10] || 'Pusat',
      createdAt: Number(r[11]) || Date.now()
    })).filter(b => b.id && b.studentId);

    // 8. Parse Incomes
    const incRows = getRowsForSheet(SHEET_NAMES.INCOMES);
    const manualIncomes: FinanceIncome[] = incRows.map(r => ({
      id: r[0] || '',
      date: r[1] || '',
      category: (r[2] as any) || 'Lainnya',
      amount: Number(r[3]) || 0,
      source: r[4] || '',
      notes: r[5] || '',
      invoiceId: r[6] || undefined,
      branch: r[7] || 'Pusat',
      createdAt: Number(r[8]) || Date.now()
    })).filter(inc => inc.id);

    // 9. Parse Expenses
    const expRows = getRowsForSheet(SHEET_NAMES.EXPENSES);
    const expenses: FinanceExpense[] = expRows.map(r => ({
      id: r[0] || '',
      date: r[1] || '',
      category: (r[2] as any) || 'Lainnya',
      amount: Number(r[3]) || 0,
      paidTo: r[4] || '',
      paymentMethod: (r[5] as any) || 'Transfer',
      notes: r[6] || '',
      branch: r[7] || 'Pusat',
      createdAt: Number(r[8]) || Date.now()
    })).filter(exp => exp.id);

    // 10. Parse Branches
    const branchRows = getRowsForSheet(SHEET_NAMES.BRANCHES);
    const branches: Branch[] = branchRows.map(r => ({
      id: r[0] || '',
      name: r[1] || '',
      address: r[2] || '',
      phone: r[3] || '',
      createdAt: Number(r[4]) || Date.now()
    })).filter(b => b.id && b.name);

    // 11. Parse Admins
    const adminRows = getRowsForSheet(SHEET_NAMES.ADMINS);
    const adminUsers: AdminUser[] = adminRows.map(r => ({
      username: r[0] || '',
      name: r[1] || '',
      role: (r[2] === 'super_admin' || r[2] === 'branch_assistant') ? r[2] : 'branch_admin',
      branch: r[3] || 'Pusat',
      email: r[4] || '',
      authProvider: 'google' as const
    })).filter(u => u.username && u.name);

    return {
      students,
      classes,
      attendance,
      notes,
      invoices,
      grades,
      behaviorAssessments,
      manualIncomes,
      expenses,
      branches,
      adminUsers
    };
  }

  /**
   * Menuliskan / Menyinkronkan seluruh data aplikasi ke Google Spreadsheet (Push Data)
   */
  public async pushAllDataToSpreadsheet(data: {
    students: Student[];
    classes: ClassGroup[];
    attendance: Attendance[];
    notes: TeacherNote[];
    invoices: Invoice[];
    grades: Grade[];
    behaviorAssessments?: StudentBehaviorAssessment[];
    manualIncomes?: FinanceIncome[];
    expenses?: FinanceExpense[];
    branches?: Branch[];
    adminUsers?: AdminUser[];
  }, targetSpreadsheetId?: string): Promise<void> {
    const spreadsheetId = targetSpreadsheetId || this.config?.spreadsheetId;
    if (!spreadsheetId) {
      throw new Error('ID Spreadsheet belum dikonfigurasi.');
    }

    // Pastikan seluruh tab sheet dan header ada sebelum operasi clear / write
    const activeSheets = await this.ensureSpreadsheetStructure(spreadsheetId);

    // Bersihkan isi sheet lama (Clear Data baris 2 ke bawah hanya untuk tab yang ada)
    const rangesToClear = Object.keys(SHEET_HEADERS)
      .filter(name => activeSheets.includes(name))
      .map(name => `'${name}'!A2:Z5000`);

    if (rangesToClear.length > 0) {
      try {
        await this.fetchWithAuth(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
          {
            method: 'POST',
            body: JSON.stringify({ ranges: rangesToClear })
          }
        );
      } catch (clearErr) {
        console.warn('Peringatan saat membersihkan baris lama di spreadsheet:', clearErr);
      }
    }

    // Format Baris Data Baru
    const dataBatch: any[] = [];

    if (!data) return;

    // 1. Students Rows
    const studentRows = (data.students || []).map(s => [
      s.id, s.name, s.parentName, s.parentPhone, s.joinDate, s.level,
      s.status, s.keterangan || '', s.tempatLahir || '', s.tanggalLahir || '',
      s.jenisPaket || '', s.jenisKelamin || '', s.alamat || '', s.branch || 'Pusat',
      s.hariLes || '', s.uniqueCode || '', s.kelas || '', s.createdAt || Date.now()
    ]);
    if (studentRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.STUDENTS}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.STUDENTS].length)}${studentRows.length + 1}`,
        values: studentRows
      });
    }

    // 2. Classes Rows
    const classRows = (data.classes || []).map(c => [
      c.id, c.name, c.scheduleDays || '', c.scheduleTime || '', c.teacherName || '',
      c.quota || 15, c.room || '', c.level || '', c.branch || 'Pusat', c.createdAt || Date.now()
    ]);
    if (classRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.CLASSES}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.CLASSES].length)}${classRows.length + 1}`,
        values: classRows
      });
    }

    // 3. Attendance Rows
    const attRows = (data.attendance || []).map(a => [
      a.id, a.studentId, a.studentName, a.date, a.status, a.notes || '', a.branch || 'Pusat'
    ]);
    if (attRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.ATTENDANCE}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.ATTENDANCE].length)}${attRows.length + 1}`,
        values: attRows
      });
    }

    // 4. Notes Rows
    const noteRows = (data.notes || []).map(n => [
      n.id, n.studentId, n.studentName, n.date, n.topic, n.content, n.teacherName, n.branch || 'Pusat'
    ]);
    if (noteRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.NOTES}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.NOTES].length)}${noteRows.length + 1}`,
        values: noteRows
      });
    }

    // 5. Invoices Rows
    const invoiceRows = (data.invoices || []).map(i => [
      i.id, i.invoiceNo, i.studentId, i.studentName, i.amount, i.month,
      i.dueDate, i.status, i.paidAt || '', i.paymentMethod || 'Transfer',
      i.amountPaid || 0, i.category || 'spp', i.branch || 'Pusat', i.createdAt || Date.now()
    ]);
    if (invoiceRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.INVOICES}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.INVOICES].length)}${invoiceRows.length + 1}`,
        values: invoiceRows
      });
    }

    // 6. Grades Rows
    const gradeRows = (data.grades || []).map(g => [
      g.id, g.studentId, g.studentName, g.date, g.topic, g.score, g.speedSeconds || 0, g.notes || '', g.branch || 'Pusat'
    ]);
    if (gradeRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.GRADES}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.GRADES].length)}${gradeRows.length + 1}`,
        values: gradeRows
      });
    }

    // 7. Behavior Assessments
    const behaviorRows = (data.behaviorAssessments || []).map(b => [
      b.id, b.studentId, b.studentName, b.date, b.topic || '', b.fokus, b.partisipasi, b.sikapKeaktifan, b.notes || '', b.teacherName || '', b.branch || 'Pusat', b.createdAt || Date.now()
    ]);
    if (behaviorRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.BEHAVIOR}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.BEHAVIOR].length)}${behaviorRows.length + 1}`,
        values: behaviorRows
      });
    }

    // 8. Manual Incomes
    const incomeRows = (data.manualIncomes || []).map(inc => [
      inc.id, inc.date, inc.category, inc.amount, inc.source, inc.notes || '', inc.invoiceId || '', inc.branch || 'Pusat', inc.createdAt || Date.now()
    ]);
    if (incomeRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.INCOMES}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.INCOMES].length)}${incomeRows.length + 1}`,
        values: incomeRows
      });
    }

    // 9. Expenses
    const expRows = (data.expenses || []).map(exp => [
      exp.id, exp.date, exp.category, exp.amount, exp.paidTo, exp.paymentMethod || 'Transfer', exp.notes || '', exp.branch || 'Pusat', exp.createdAt || Date.now()
    ]);
    if (expRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.EXPENSES}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.EXPENSES].length)}${expRows.length + 1}`,
        values: expRows
      });
    }

    // 10. Branches
    const branchRows = (data.branches || []).map(b => [
      b.id, b.name, b.address || '', b.phone || '', b.createdAt || Date.now()
    ]);
    if (branchRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.BRANCHES}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.BRANCHES].length)}${branchRows.length + 1}`,
        values: branchRows
      });
    }

    // 11. Admins
    const adminRows = (data.adminUsers || []).map(u => [
      u.username, u.name, u.role, u.branch, u.email || '', Date.now()
    ]);
    if (adminRows.length > 0) {
      dataBatch.push({
        range: `'${SHEET_NAMES.ADMINS}'!A2:${this.getColumnLetter(SHEET_HEADERS[SHEET_NAMES.ADMINS].length)}${adminRows.length + 1}`,
        values: adminRows
      });
    }

    if (dataBatch.length > 0) {
      const updateRes = await this.fetchWithAuth(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: dataBatch
          })
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Gagal memperbarui data baris di Google Sheets.');
      }
    }

    // Update timestamp
    if (this.config) {
      this.config.lastSyncedAt = new Date().toISOString();
      this.config.syncStatus = 'success';
      this.saveConfig(this.config);
    }
  }

  // Helper untuk mendapatkan huruf kolom (1 -> A, 2 -> B, ..., 26 -> Z)
  private getColumnLetter(colNumber: number): string {
    let letter = '';
    let curr = colNumber;
    while (curr > 0) {
      const rem = (curr - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      curr = Math.floor((curr - rem - 1) / 26);
    }
    return letter;
  }
}

export const googleSheetsService = new GoogleSheetsService();
