import React, { useState, useRef, useEffect } from 'react';
import { Student, ClassGroup, Branch } from '../types';
import { getStudentUniqueCode } from '../utils';
import jsQR from 'jsqr';
import { 
  Search, 
  QrCode, 
  Printer, 
  Download, 
  X, 
  Layers, 
  Building, 
  RefreshCw, 
  FileImage, 
  ShieldCheck,
  Camera,
  Upload,
  AlertCircle,
  Check,
  Sliders,
  Scissors,
  CheckCircle2
} from 'lucide-react';

interface StudentQrCardsProps {
  students: Student[];
  classes?: ClassGroup[];
  branches?: Branch[];
  attendance?: any[];
  onAddAttendanceBatch?: (records: any[]) => Promise<void>;
  theme?: string;
}

export function StudentQrCards({
  students,
  classes = [],
  branches = [],
  attendance = [],
  onAddAttendanceBatch,
  theme = 'dark'
}: StudentQrCardsProps) {
  const isLight = theme === 'light';
  
  // Basic states
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Print Setup Options
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState<'responsive' | 'a4-3x4' | 'a4-idcard'>('a4-3x4');
  const [printInkSaver, setPrintInkSaver] = useState(false);
  const [printShowLogo, setPrintShowLogo] = useState(true);
  const [printShowScissors, setPrintShowScissors] = useState(true);
  const [printShowDetails, setPrintShowDetails] = useState(true);

  // Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [scanError, setScanError] = useState('');
  const [manualCode, setManualCode] = useState('');

  // Scanner Confirmation Dialog States
  const [selectedScanStudent, setSelectedScanStudent] = useState<Student | null>(null);
  const [scanStatus, setScanStatus] = useState<'present' | 'absent' | 'permission'>('present');
  const [scanNotes, setScanNotes] = useState('');
  const [scanDate, setScanDate] = useState(new Date().toISOString().slice(0, 10));
  const [scanSaving, setScanSaving] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Refs for Web-cam QR scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Filter students
  const activeStudents = students.filter(s => s.status === 'active');

  const availableBranches = Array.from(
    new Set([
      'Pusat',
      ...branches.map(b => b.name),
      ...activeStudents.map(s => s.branch).filter((b): b is string => Boolean(b && b.trim()))
    ])
  ).filter(Boolean);

  const availableClasses = Array.from(
    new Set([
      ...classes.map(c => c.name),
      ...activeStudents.map(s => s.kelas).filter((k): k is string => Boolean(k && k.trim()))
    ])
  ).filter(Boolean);

  const filteredStudents = activeStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getStudentUniqueCode(student).includes(searchQuery);
    const matchesBranch = branchFilter === 'All' || (student.branch || 'Pusat') === branchFilter;
    const matchesClass = classFilter === 'All' || (student.kelas || '') === classFilter;
    
    return matchesSearch && matchesBranch && matchesClass;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Helper to generate URLs and Images for QR code
  const getQrUrl = (student: Student) => {
    return `${window.location.origin}${window.location.pathname}?scan_student=${student.id}`;
  };

  const getQrImgSrc = (student: Student, size: number = 200, inkSaver: boolean = false) => {
    const dataUrl = getQrUrl(student);
    // Dark color of QR: Black for inkSaver, emerald color (059669 -> "059669") for premium colored
    const qrColor = inkSaver ? '000000' : '059669';
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dataUrl)}&color=${qrColor}`;
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setScanError('');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(videoDevices);
      
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } } 
          : { facingMode: 'environment' }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setScannerActive(true);
      }
    } catch (err: any) {
      console.error(err);
      setScanError('Tidak dapat mengakses kamera. Pastikan Anda mengizinkan akses kamera di peramban Anda.');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
  };

  // Monitor Camera scan state transitions
  useEffect(() => {
    if (isScannerOpen && selectedTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isScannerOpen, selectedTab, selectedDeviceId]);

  // Real-time Frame Analysis loop using jsQR
  useEffect(() => {
    if (!scannerActive) return;

    const scanTick = () => {
      if (!videoRef.current || !canvasRef.current || !scannerActive) {
        animationFrameRef.current = requestAnimationFrame(scanTick);
        return;
      }

      // Safe readyState checking (HAVE_CURRENT_DATA is 2, HAVE_ENOUGH_DATA is 4)
      if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            
            if (code && code.data && code.data.trim().length >= 4) {
              handleScanSuccess(code.data);
              return; // stop execution frame, successfully parsed
            }
          } catch (err) {
            console.error('Failed to analyze frame:', err);
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(scanTick);
    };

    animationFrameRef.current = requestAnimationFrame(scanTick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scannerActive]);

  // Handle successful QR detection
  const handleScanSuccess = (decodedData: string) => {
    let studentId = '';
    try {
      if (decodedData.includes('scan_student=')) {
        const match = decodedData.match(/[?&]scan_student=([^&?#]+)/) || decodedData.match(/scan_student=([^&?#]+)/);
        if (match) {
          studentId = match[1];
        }
      }
    } catch (e) {
      // ignore parsing error
    }

    if (!studentId) {
      studentId = decodedData.trim();
    }

    // Match student
    const matched = students.find(
      s => s.id === studentId || getStudentUniqueCode(s) === studentId
    );

    if (matched) {
      // Sound cue
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch (e) {}

      // Open Confirmation Overlay and Close Scanner
      setSelectedScanStudent(matched);
      setIsScannerOpen(false);
      stopCamera();
    } else {
      alert(`QR Code terbaca ("${decodedData}"), tetapi siswa tidak ditemukan dalam database.`);
    }
  };

  // Image upload decoding
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data && code.data.trim().length >= 4) {
            handleScanSuccess(code.data);
          } else {
            alert('Tidak ditemukan QR Code valid pada gambar ini. Silakan unggah gambar yang lebih jelas.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manual keypress/scanner submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
    setManualCode('');
  };

  // Save the attendance to database
  const handleSaveConfirmedAttendance = async () => {
    if (!selectedScanStudent || !onAddAttendanceBatch) return;

    setScanSaving(true);
    try {
      const defaultBranchName = branches[0]?.name || 'Pusat';
      const branchToSet = selectedScanStudent.branch || defaultBranchName;
      
      const record = {
        studentId: selectedScanStudent.id,
        studentName: selectedScanStudent.name,
        date: scanDate,
        status: scanStatus,
        notes: scanNotes,
        branch: branchToSet
      };

      await onAddAttendanceBatch([record]);
      setScanSuccess(true);
      setTimeout(() => {
        setSelectedScanStudent(null);
        setScanSuccess(false);
        setScanNotes('');
        setScanStatus('present');
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Gagal merekam presensi siswa.');
    } finally {
      setScanSaving(false);
    }
  };

  // PRINT ENGINES (Supporting Single, Responsive Grid, and specialized A4 templates)
  const handlePrintSingle = (student: Student) => {
    const qrSrc = getQrImgSrc(student, 300);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu QR - ${student.name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 95vh;
              margin: 0;
              background-color: #f8fafc;
            }
            .card {
              border: 3px solid #059669;
              border-radius: 20px;
              padding: 24px;
              width: 320px;
              text-align: center;
              background: white;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
              position: relative;
            }
            .card::before {
              content: '';
              position: absolute;
              inset: 4px;
              border: 1px dashed #059669;
              border-radius: 16px;
              pointer-events: none;
            }
            .logo {
              font-size: 20px;
              font-weight: 900;
              color: #059669;
              margin-bottom: 2px;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 10px;
              color: #64748b;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 16px;
            }
            .qr-container {
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              padding: 12px;
              border-radius: 12px;
              display: inline-block;
              margin: 10px 0;
            }
            .qr-image {
              width: 180px;
              height: 180px;
              display: block;
            }
            .student-name {
              font-size: 18px;
              font-weight: 850;
              color: #1e293b;
              margin: 12px 0 4px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .student-code {
              font-family: monospace;
              font-size: 12px;
              font-weight: bold;
              background: #e2e8f0;
              color: #475569;
              padding: 3px 8px;
              border-radius: 6px;
              display: inline-block;
              margin-bottom: 12px;
            }
            .info-box {
              background: #f8fafc;
              border-radius: 8px;
              padding: 10px;
              font-size: 11px;
              border: 1px solid #e2e8f0;
              text-align: left;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .label {
              color: #64748b;
            }
            .value {
              color: #334155;
              font-weight: 700;
            }
            .footer {
              font-size: 9px;
              color: #94a3b8;
              margin-top: 14px;
              font-weight: 500;
            }
            @media print {
              body { background: white; }
              .card { box-shadow: none; border: 3px solid #059669; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Math Fingers</div>
            <div class="subtitle">Kartu Presensi Siswa</div>
            
            <div class="qr-container">
              <img class="qr-image" src="${qrSrc}" alt="QR Code" />
            </div>

            <div class="student-name">${student.name}</div>
            <div class="student-code">ID: #${getStudentUniqueCode(student)}</div>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Cabang:</span>
                <span class="value">${student.branch || 'Pusat'}</span>
              </div>
              <div class="info-row">
                <span class="label">Kelas:</span>
                <span class="value">${student.kelas || '-'}</span>
              </div>
              <div class="info-row">
                <span class="label">Level:</span>
                <span class="value">${student.level ? student.level.split(':')[0] : 'Dasar'}</span>
              </div>
            </div>

            <div class="footer">Tempel kartu ini pada buku modul les atau simpan di ID Card holder Anda.</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintBulkExecute = () => {
    if (filteredStudents.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Ink saver adjustments
    const primaryColor = printInkSaver ? '#000000' : '#059669';
    const secondaryColor = printInkSaver ? '#334155' : '#047857';
    const bgContainer = printInkSaver ? '#ffffff' : '#f0fdf4';
    const borderContainer = printInkSaver ? '1px solid #000000' : '1px solid #bbf7d0';
    const cardBg = '#ffffff';
    const textColor = '#1e293b';
    const codeBg = printInkSaver ? '#f1f5f9' : '#e2e8f0';

    // Building HTML cards
    let bodyHtml = '';

    if (printLayout === 'responsive') {
      // Responsive Grid Free Layout
      const cardsHtml = filteredStudents.map(student => {
        const qrSrc = getQrImgSrc(student, 250, printInkSaver);
        return `
          <div class="card">
            ${printShowLogo ? `
              <div class="logo">Math Fingers</div>
              <div class="subtitle">Kartu Presensi Siswa</div>
            ` : ''}
            
            <div class="qr-container">
              <img class="qr-image" src="${qrSrc}" alt="QR Code" />
            </div>

            <div class="student-name">${student.name}</div>
            <div class="student-code">ID: #${getStudentUniqueCode(student)}</div>

            ${printShowDetails ? `
              <div class="info-box">
                <div class="info-row">
                  <span class="label">Cabang:</span>
                  <span class="value">${student.branch || 'Pusat'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Kelas:</span>
                  <span class="value">${student.kelas || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Level:</span>
                  <span class="value">${student.level ? student.level.split(':')[0] : 'Dasar'}</span>
                </div>
              </div>
            ` : ''}

            <div class="footer">Tempel kartu ini pada buku modul les atau simpan di ID Card holder Anda.</div>
          </div>
        `;
      }).join('');

      bodyHtml = `<div class="responsive-grid">${cardsHtml}</div>`;

    } else if (printLayout === 'a4-3x4') {
      // Clean A4 pages with 3 columns and 4 rows (12 cards per sheet)
      const cardsPerPage = 12;
      const totalPages = Math.ceil(filteredStudents.length / cardsPerPage);
      
      let pagesHtml = '';
      for (let p = 0; p < totalPages; p++) {
        const pageStudents = filteredStudents.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
        
        const pageCardsHtml = pageStudents.map(student => {
          const qrSrc = getQrImgSrc(student, 220, printInkSaver);
          return `
            <div class="card-a4-3x4 ${printShowScissors ? 'scissors-border' : ''}">
              ${printShowLogo ? `
                <div class="logo">Math Fingers</div>
                <div class="subtitle">Kartu Presensi Siswa</div>
              ` : ''}
              
              <div class="qr-container">
                <img class="qr-image" src="${qrSrc}" alt="QR Code" />
              </div>

              <div class="student-name">${student.name}</div>
              <div class="student-code">ID: #${getStudentUniqueCode(student)}</div>

              ${printShowDetails ? `
                <div class="info-box">
                  <div class="info-row">
                    <span class="label">Cabang:</span>
                    <span class="value">${student.branch || 'Pusat'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Kelas:</span>
                    <span class="value">${student.kelas || '-'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Level:</span>
                    <span class="value">${student.level ? student.level.split(':')[0] : 'Dasar'}</span>
                  </div>
                </div>
              ` : ''}

              <div class="footer">Simpan kartu ini di ID Card holder Anda.</div>
            </div>
          `;
        }).join('');
        
        pagesHtml += `
          <div class="a4-page page-a4-3x4">
            ${pageCardsHtml}
          </div>
        `;
      }
      bodyHtml = pagesHtml;

    } else if (printLayout === 'a4-idcard') {
      // Standard Vertical ID Card dimensions (54mm x 86mm), 3 columns and 3 rows (9 cards per sheet)
      const cardsPerPage = 9;
      const totalPages = Math.ceil(filteredStudents.length / cardsPerPage);
      
      let pagesHtml = '';
      for (let p = 0; p < totalPages; p++) {
        const pageStudents = filteredStudents.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
        
        const pageCardsHtml = pageStudents.map(student => {
          const qrSrc = getQrImgSrc(student, 200, printInkSaver);
          return `
            <div class="card-id-card ${printShowScissors ? 'scissors-border' : ''}">
              ${printShowLogo ? `
                <div class="logo" style="font-size: 13px; margin-top: 2px;">Math Fingers</div>
                <div class="subtitle" style="font-size: 7px; margin-bottom: 4px;">Kartu Presensi</div>
              ` : ''}
              
              <div class="qr-container" style="padding: 4px; margin: 2px 0;">
                <img class="qr-image" style="width: 100px; height: 100px;" src="${qrSrc}" alt="QR Code" />
              </div>

              <div class="student-name" style="font-size: 12px; margin: 4px 0 1px 0;">${student.name}</div>
              <div class="student-code" style="font-size: 8px; padding: 1px 4px; margin-bottom: 4px;">ID: #${getStudentUniqueCode(student)}</div>

              ${printShowDetails ? `
                <div class="info-box" style="padding: 4px; font-size: 8px; border-radius: 4px;">
                  <div class="info-row">
                    <span class="label">Cabang:</span>
                    <span class="value">${student.branch || 'Pusat'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Kelas:</span>
                    <span class="value">${student.kelas || '-'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Level:</span>
                    <span class="value">${student.level ? student.level.split(':')[0] : 'Dasar'}</span>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
        
        pagesHtml += `
          <div class="a4-page page-a4-idcard">
            ${pageCardsHtml}
          </div>
        `;
      }
      bodyHtml = pagesHtml;
    }

    // Output raw printer document with beautiful styles
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu QR Siswa (${filteredStudents.length} Siswa)</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* Responsive Grid View */
            .responsive-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
              gap: 15px;
              padding: 20px;
              justify-content: center;
            }
            .card {
              border: 3px solid ${primaryColor};
              border-radius: 16px;
              padding: 16px;
              background: ${cardBg};
              text-align: center;
              position: relative;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .card::before {
              content: '';
              position: absolute;
              inset: 3px;
              border: 1px dashed ${primaryColor};
              border-radius: 12px;
              pointer-events: none;
            }

            /* A4 Sheets structure */
            .a4-page {
              width: 210mm;
              height: 297mm;
              padding: 10mm;
              margin: 0 auto;
              box-sizing: border-box;
              background: white;
              page-break-after: always;
              overflow: hidden;
            }
            
            /* Grid 3x4: Exactly fits 12 cards on standard A4 page */
            .page-a4-3x4 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-template-rows: repeat(4, 1fr);
              grid-gap: 4mm;
            }
            .card-a4-3x4 {
              border: 2px solid ${primaryColor};
              border-radius: 12px;
              padding: 10px;
              background: ${cardBg};
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              position: relative;
              height: 100%;
            }
            
            /* Vertical ID Card Layout (54mm x 86mm): Fits 3x3 = 9 cards perfectly on A4 */
            .page-a4-idcard {
              display: grid;
              grid-template-columns: repeat(3, 58mm);
              grid-template-rows: repeat(3, 90mm);
              grid-gap: 5mm;
              justify-content: center;
              align-content: center;
              padding: 12mm 10mm;
            }
            .card-id-card {
              width: 58mm;
              height: 90mm;
              border: 1.5px solid ${primaryColor};
              border-radius: 8px;
              padding: 6px;
              background: ${cardBg};
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              position: relative;
            }

            /* Cut guides */
            .scissors-border {
              position: relative;
            }
            .scissors-border::after {
              content: '✂';
              position: absolute;
              top: -8px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 10px;
              color: #94a3b8;
              background: white;
              padding: 0 4px;
              z-index: 10;
            }
            
            /* Shared components styling */
            .logo {
              font-size: 15px;
              font-weight: 900;
              color: ${primaryColor};
              margin-bottom: 1px;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 8px;
              color: #64748b;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .qr-container {
              background: ${bgContainer};
              border: ${borderContainer};
              padding: 8px;
              border-radius: 10px;
              display: inline-block;
              margin: 4px auto;
              max-width: fit-content;
            }
            .qr-image {
              display: block;
              margin: 0 auto;
            }
            .student-name {
              font-size: 13px;
              font-weight: 800;
              color: ${textColor};
              margin: 6px 0 2px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .student-code {
              font-family: monospace;
              font-size: 9px;
              font-weight: bold;
              background: ${codeBg};
              color: #475569;
              padding: 2px 6px;
              border-radius: 4px;
              display: inline-block;
              margin: 0 auto 6px auto;
            }
            .info-box {
              background: #f8fafc;
              border-radius: 6px;
              padding: 6px;
              font-size: 9px;
              border: 1px solid #e2e8f0;
              text-align: left;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .info-row:last-child {
              margin-bottom: 0;
            }
            .label {
              color: #64748b;
            }
            .value {
              color: #334155;
              font-weight: 700;
            }
            .footer {
              font-size: 7.5px;
              color: #94a3b8;
              margin-top: 6px;
              line-height: 1.2;
            }
            
            @media print {
              .a4-page {
                box-shadow: none;
                margin: 0;
                page-break-after: always;
              }
              .a4-page:last-child {
                page-break-after: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${bodyHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrintModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Camera Scan Button and Print Options trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
            Kartu QR Presensi Siswa
          </h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm mt-1`}>
            Cetak kartu QR, scan untuk mencatat presensi, atau unduh gambar QR.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* CAMERA SCANNER TRIGGER BUTTON */}
          <button
            type="button"
            onClick={() => {
              setIsScannerOpen(true);
              setSelectedTab('camera');
            }}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4.5 py-2.5 rounded-xl transition duration-150 shadow-md cursor-pointer text-sm"
          >
            <Camera size={18} />
            <span>Scan QR Presensi</span>
          </button>

          {/* PRINT MENU TRIGGER BUTTON */}
          {filteredStudents.length > 0 && (
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className={`flex items-center justify-center gap-2 border font-bold px-4.5 py-2.5 rounded-xl transition duration-150 cursor-pointer text-sm ${
                isLight 
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' 
                  : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Printer size={18} />
              <span>Cetak Massal...</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className={`p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 items-center ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Cari nama siswa atau masukkan ID kode..."
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
          {/* Cabang Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All">Semua Cabang</option>
            {availableBranches.map(b => (
              <option key={b} value={b}>Cabang: {b}</option>
            ))}
          </select>

          {/* Kelas Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700' 
                : 'bg-slate-950/40 border-slate-800 text-slate-300'
            }`}
          >
            <option value="All">Semua Kelas</option>
            {availableClasses.map(k => (
              <option key={k} value={k}>Kelas: {k}</option>
            ))}
          </select>

          {(searchQuery || branchFilter !== 'All' || classFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBranchFilter('All');
                setClassFilter('All');
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition flex items-center gap-1 cursor-pointer"
            >
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid displays student list with preview button */}
      {filteredStudents.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
          <QrCode size={44} className="mx-auto mb-3 text-slate-500/70" />
          <p className="font-medium text-sm">Tidak ada siswa yang aktif untuk kriteria ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStudents.map(student => (
            <div
              key={student.id}
              className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                isLight ? 'bg-white border-slate-200/80' : 'bg-slate-900 border-slate-800/80'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15`}>
                    #{getStudentUniqueCode(student)}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    student.branch ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/15' : 'bg-slate-500/10 text-slate-500 border border-slate-500/15'
                  }`}>
                    {student.branch || 'Pusat'}
                  </span>
                </div>

                <h4 className={`font-extrabold text-base truncate ${isLight ? 'text-slate-900' : 'text-white'}`} title={student.name}>
                  {student.name}
                </h4>
                
                <div className="mt-1 space-y-0.5 text-xs text-slate-450 font-medium">
                  <div>Kelas: <span className="text-emerald-500 font-bold">{student.kelas || 'Tanpa Kelas'}</span></div>
                  <div className="truncate">Level: <span className={isLight ? 'text-slate-650' : 'text-slate-350'}>{student.level ? student.level.split(':')[0] : 'Dasar'}</span></div>
                </div>
              </div>

              {/* QR Image Mini Preview */}
              <div className="my-3.5 bg-white p-2 rounded-xl border border-slate-200/50 max-w-[110px] mx-auto">
                <img
                  src={getQrImgSrc(student, 100)}
                  alt="QR Mini Preview"
                  className="w-24 h-24 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <QrCode size={13} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintSingle(student)}
                  className="py-2 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Cetak</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SINGLE STUDENT PREVIEW MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-4 sm:pt-12 md:pt-16 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-sm shadow-2xl border p-6 sm:p-7 relative ${
            isLight ? 'bg-white border-slate-200 text-slate-850' : 'bg-[#090d16] border-slate-800 text-white'
          }`}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
            >
              <X size={20} />
            </button>

            {/* Print Card Template Preview */}
            <div className="text-center">
              <span className="text-[10px] font-extrabold tracking-widest text-emerald-500 uppercase px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/15 mb-3.5 inline-block">
                PREVIEW KARTU SISWA
              </span>

              {/* CARD PREVIEW DESIGN */}
              <div className={`p-5 rounded-2xl border text-center shadow-inner relative overflow-hidden my-3 max-w-[280px] mx-auto ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-850/80'
              }`}>
                {/* Dashed Inner border */}
                <div className="absolute inset-1.5 border border-dashed border-emerald-500/30 rounded-xl pointer-events-none" />

                <div className="text-emerald-500 font-black text-lg tracking-tight mb-0.5 z-10 relative">
                  Math Fingers
                </div>
                <div className="text-[9px] text-slate-450 uppercase font-bold tracking-wider mb-3 z-10 relative">
                  Kartu Presensi Siswa
                </div>

                {/* QR Image in Card */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block my-1 z-10 relative shadow-sm">
                  <img
                    src={getQrImgSrc(selectedStudent, 200)}
                    alt="QR Code Preview"
                    className="w-36 h-36 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className={`font-black text-base mt-2.5 truncate z-10 relative ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {selectedStudent.name}
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-400 mt-0.5 mb-2.5 bg-slate-150 dark:bg-slate-900 px-2 py-0.5 rounded-md inline-block z-10 relative">
                  ID: #{getStudentUniqueCode(selectedStudent)}
                </div>

                {/* Info block */}
                <div className="text-left text-[11px] space-y-1.5 border-t border-slate-200/50 dark:border-slate-850 pt-2.5 z-10 relative">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Cabang:</span>
                    <span className="text-slate-200 font-bold">{selectedStudent.branch || 'Pusat'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Kelas:</span>
                    <span className="text-emerald-500 font-bold">{selectedStudent.kelas || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Level:</span>
                    <span className="text-slate-300 font-bold truncate max-w-[120px]" title={selectedStudent.level}>
                      {selectedStudent.level ? selectedStudent.level.split(':')[0] : 'Dasar'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const imgUrl = getQrImgSrc(selectedStudent, 500);
                    const link = document.createElement('a');
                    link.href = imgUrl;
                    link.target = '_blank';
                    link.download = `QR_${selectedStudent.name}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <Download size={14} />
                  <span>Unduh QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrintSingle(selectedStudent);
                    setSelectedStudent(null);
                  }}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Kartu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI/BULK PRINT CONFIGURATION MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-4 sm:pt-12 md:pt-16 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-md shadow-2xl border p-6 relative animate-page-fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#090d16] border-slate-800 text-white'
          }`}>
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-850">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Pengaturan Cetak Massal</h3>
                <p className="text-xs text-slate-400">Atur tata letak cetak ramah printer kertas A4.</p>
              </div>
            </div>

            {/* Print settings controls */}
            <div className="space-y-4">
              {/* Layout option selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipe Tata Letak</label>
                <div className="space-y-2">
                  {[
                    { id: 'a4-3x4', title: 'A4 Grid Kartu (3 Kolom x 4 Baris)', desc: 'Pas 12 kartu per lembar kertas A4. Efisien kertas.' },
                    { id: 'a4-idcard', title: 'A4 Vertikal ID Card (54mm x 86mm)', desc: 'Pas 9 kartu per lembar. Pas dimasukkan plastik ID Card.' },
                    { id: 'responsive', title: 'Kisi Bebas (Responsif Layar)', desc: 'Menyesuaikan grid di halaman tanpa batas kertas khusus.' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPrintLayout(item.id as any)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                        printLayout === item.id 
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-bold' 
                          : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-850 hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        printLayout === item.id ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-600'
                      }`}>
                        {printLayout === item.id && <Check size={12} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{item.title}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Design settings Toggles */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Opsi Tampilan & Penghematan</label>
                <div className="space-y-2">
                  {/* Ink saver mode */}
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-850 hover:bg-slate-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="text-slate-400 shrink-0"><RefreshCw size={15} /></div>
                      <div>
                        <div className="text-xs font-bold">Mode Hemat Tinta (Hitam-Putih)</div>
                        <div className="text-[9px] text-slate-450">Konversi warna & background jadi putih, menghemat tinta printer Anda.</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={printInkSaver}
                      onChange={(e) => setPrintInkSaver(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded border-slate-300"
                    />
                  </label>

                  {/* Show scissors guide */}
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-850 hover:bg-slate-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="text-slate-400 shrink-0"><Scissors size={15} /></div>
                      <div>
                        <div className="text-xs font-bold">Garis Pandu Gunting</div>
                        <div className="text-[9px] text-slate-450">Tampilkan garis putus-putus dan ikon gunting di tepi luar untuk memotong rapi.</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={printShowScissors}
                      onChange={(e) => setPrintShowScissors(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded border-slate-300"
                    />
                  </label>

                  {/* Show Logo */}
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-850 hover:bg-slate-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="text-slate-400 shrink-0"><ShieldCheck size={15} /></div>
                      <div>
                        <div className="text-xs font-bold">Tampilkan Header "Math Fingers"</div>
                        <div className="text-[9px] text-slate-450">Sertakan logo lembaga dan teks kartu di bagian atas.</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={printShowLogo}
                      onChange={(e) => setPrintShowLogo(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded border-slate-300"
                    />
                  </label>

                  {/* Show details */}
                  <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-850 hover:bg-slate-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="text-slate-400 shrink-0"><Layers size={15} /></div>
                      <div>
                        <div className="text-xs font-bold">Tampilkan Detail Siswa (Cabang, Kelas, Level)</div>
                        <div className="text-[9px] text-slate-450">Sertakan kotak ringkasan profil di bagian bawah kartu.</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={printShowDetails}
                      onChange={(e) => setPrintShowDetails(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded border-slate-300"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 text-slate-400'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePrintBulkExecute}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Mulai Cetak ({filteredStudents.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCAN QR PRESENSI INTERACTIVE MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-start justify-center p-2 pt-2 sm:p-4 sm:pt-4 md:pt-6 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-lg shadow-2xl border p-4 sm:p-5 relative animate-page-fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#090d16] border-slate-850 text-white'
          }`}>
            <button
              onClick={() => {
                setIsScannerOpen(false);
                stopCamera();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-850">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <QrCode size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">Scan QR Absensi Masuk</h3>
                <p className="text-[10px] sm:text-xs text-slate-400">Gunakan Kamera, Unggah Berkas Gambar, atau Scanner Fisik.</p>
              </div>
            </div>

            {/* Tab selection for scanner modes */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950/40 border border-slate-850 mb-3">
              {[
                { id: 'camera', label: 'Kamera Aktif', icon: Camera },
                { id: 'upload', label: 'Unggah Gambar', icon: Upload },
                { id: 'manual', label: 'Input Scanner', icon: Search }
              ].map(tab => {
                const isSel = selectedTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`py-2 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isSel 
                        ? 'bg-emerald-600 text-white' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB: CAMERA ACTIVE STREAM SCAN */}
            {selectedTab === 'camera' && (
              <div className="space-y-3">
                {scanError ? (
                  <div className="p-4 rounded-xl border border-red-500/15 bg-red-500/5 text-red-500 text-xs flex gap-2.5 items-start">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>{scanError}</div>
                  </div>
                ) : (
                  <div className="relative w-full aspect-video max-w-xs sm:max-w-sm mx-auto overflow-hidden rounded-2xl border border-slate-800 bg-black flex items-center justify-center">
                    
                    {/* Hidden canvas for decoder */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Video Camera Stream */}
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />

                    {/* Scanning overlay frame lines */}
                    <div className="absolute inset-0 border-2 border-emerald-500/10 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-dashed border-emerald-500/80 rounded-2xl relative">
                        {/* Glowing/pulsing green light line bar */}
                        <div className="absolute left-0 right-0 h-0.5 bg-emerald-500/70 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" style={{
                          animation: 'scanBar 2s infinite linear'
                        }} />
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1.5 rounded-md text-[10px] text-slate-300 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Mendeteksi QR otomatis...
                    </div>
                  </div>
                )}

                {/* Camera Selection Dropdown */}
                {cameraDevices.length > 1 && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ganti Kamera</label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {cameraDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Kamera ${cameraDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPLOAD PICTURE WITH QR CODE */}
            {selectedTab === 'upload' && (
              <div className="space-y-4 text-center py-6">
                <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 max-w-sm mx-auto hover:border-emerald-500/40 transition">
                  <FileImage size={40} className="mx-auto text-slate-600 mb-3" />
                  <div className="text-sm font-bold">Pilih Berkas Gambar QR</div>
                  <p className="text-[11px] text-slate-400 mt-1 mb-5">
                    Unggah foto kartu atau gambar modul yang memuat kode QR siswa.
                  </p>
                  <label className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4.5 py-2 rounded-xl text-xs cursor-pointer inline-block transition shadow-md">
                    <span>Cari Gambar...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB: PHYSICAL BARCODE SCANNER / MANUAL LOOKUP ENTRY */}
            {selectedTab === 'manual' && (
              <div className="space-y-4 max-w-sm mx-auto">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kode / ID Siswa</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Scan kartu dengan alat scan atau ketik ID..."
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className={`flex-1 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-850 text-white'
                        }`}
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4.5 py-2.5 rounded-xl text-xs shadow-md cursor-pointer transition"
                      >
                        Temukan
                      </button>
                    </div>
                  </div>
                </form>

                <div className="p-3.5 rounded-2xl border border-slate-850 bg-slate-950/20 text-[10px] text-slate-400 leading-relaxed flex items-start gap-2">
                  <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Saran Penggunaan:</strong> Alat scan kartu USB (Barcode/QR USB Scanner) dapat dipasang langsung ke Laptop. Hubungkan kabelnya, buka tab ini, arahkan kursor ke kolom di atas, lalu scan kartu QR fisik siswa. Kehadiran akan terdeteksi instan!
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Actions */}
            <div className="mt-4 pt-3 border-t border-slate-850 text-right">
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  stopCamera();
                }}
                className={`py-2 px-5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 text-slate-450'
                }`}
              >
                Tutup Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION ATTENDANCE DIRECT FORM MODAL (WHEN STUDENT SCAN SUCCEEDS) */}
      {selectedScanStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-4 sm:pt-12 md:pt-16 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-md shadow-2xl border p-6 relative animate-page-fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-850' : 'bg-[#090d16] border-slate-850 text-white'
          }`}>
            
            {scanSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-black text-xl text-emerald-500">Kehadiran Dicatat!</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Absensi untuk <strong>{selectedScanStudent.name}</strong> berhasil disimpan untuk tanggal {scanDate}.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5 mb-5 border-b border-slate-850 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">SCAN QR BERHASIL</div>
                    <h3 className="font-extrabold text-base">Konfirmasi Presensi Masuk</h3>
                  </div>
                </div>

                {/* Profile panel */}
                <div className={`p-4 rounded-2xl border mb-4 text-sm ${
                  isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-slate-950/40 border-slate-850/85'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                      #{getStudentUniqueCode(selectedScanStudent)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                      {selectedScanStudent.branch || 'Pusat'}
                    </span>
                  </div>
                  <div className={`font-black text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {selectedScanStudent.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex gap-x-3">
                    <span>Kelas: <strong className="text-emerald-500">{selectedScanStudent.kelas || '-'}</strong></span>
                    <span>•</span>
                    <span>Level: <strong className="text-slate-350">{selectedScanStudent.level ? selectedScanStudent.level.split(':')[0] : 'Dasar'}</strong></span>
                  </div>
                </div>

                {/* Already Attended warning indicator */}
                {(() => {
                  const alreadyAttended = attendance.find(
                    a => a.studentId === selectedScanStudent.id && a.date === scanDate
                  );
                  if (!alreadyAttended) return null;
                  return (
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 mb-4 text-xs flex gap-2 items-start">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        Siswa ini sudah diabsen hari ini dengan status:{' '}
                        <strong className="uppercase font-extrabold text-amber-400">
                          {alreadyAttended.status === 'present' ? 'HADIR' : alreadyAttended.status === 'permission' ? 'IZIN' : 'ALPA'}
                        </strong>
                        . Menyimpan ulang akan memperbarui data sebelumnya.
                      </div>
                    </div>
                  );
                })()}

                {/* Input Fields */}
                <div className="space-y-4">
                  {/* Date Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Absensi</label>
                    <input
                      type="date"
                      value={scanDate}
                      onChange={(e) => setScanDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-850 text-white'
                      }`}
                    />
                  </div>

                  {/* Status Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Kehadiran</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'present', label: 'Hadir', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
                        { id: 'permission', label: 'Izin', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
                        { id: 'absent', label: 'Alpa', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/30' }
                      ].map(opt => {
                        const isSel = scanStatus === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setScanStatus(opt.id as any)}
                            className={`py-2 px-1 text-xs font-bold rounded-xl text-center border transition cursor-pointer ${
                              isSel 
                                ? opt.cls 
                                : isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-850 text-slate-400 hover:bg-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Catatan Khusus (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Datang lambat, modul tertinggal..."
                      value={scanNotes}
                      onChange={(e) => setScanNotes(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-850 text-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Submit button layout */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setSelectedScanStudent(null)}
                    disabled={scanSaving}
                    className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-850 text-slate-450'
                    }`}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfirmedAttendance}
                    disabled={scanSaving}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                  >
                    {scanSaving ? 'Menyimpan...' : 'Simpan Presensi'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
