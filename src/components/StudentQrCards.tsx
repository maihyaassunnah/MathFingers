import React, { useState, useRef, useEffect } from 'react';
import { Student, ClassGroup, Branch, AdminUser, TeacherNote } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { getStudentUniqueCode } from '../utils';
import { 
  generateStudentQrCardPDF, 
  generateBatchStudentQrCardsPDF, 
  getTeacherSignatureName 
} from '../utils/pdfGenerator';
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
  CheckCircle2,
  Maximize2,
  Minimize2,
  FileText,
  UserCheck
} from 'lucide-react';

interface StudentQrCardsProps {
  students: Student[];
  classes?: ClassGroup[];
  branches?: Branch[];
  attendance?: any[];
  notes?: TeacherNote[];
  currentUser?: AdminUser | null;
  onAddAttendanceBatch?: (records: any[]) => Promise<void>;
  theme?: string;
  isSuperAdmin?: boolean;
}

export function StudentQrCards({
  students,
  classes = [],
  branches = [],
  attendance = [],
  notes = [],
  currentUser = null,
  onAddAttendanceBatch,
  theme = 'dark',
  isSuperAdmin = false
}: StudentQrCardsProps) {
  const isLight = theme === 'light';
  
  // Basic states
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [downloadingCardId, setDownloadingCardId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [downloadingBatchPdf, setDownloadingBatchPdf] = useState(false);

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

  // Auto scan and standby states
  const [scanNotification, setScanNotification] = useState<{ name: string; type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const scanCooldownRef = useRef(false);

  // Keyboard/physical scanner hidden input states and refs
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [hiddenScannerValue, setHiddenScannerValue] = useState('');

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
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreenVideo, setIsFullscreenVideo] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenVideo(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleVideoFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen().catch((err) => {
          console.error("Error entering fullscreen:", err);
        });
      } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
        (videoContainerRef.current as any).webkitRequestFullscreen();
      }
      setIsFullscreenVideo(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreenVideo(false);
    }
  };

  // Auto-focus physical/keyboard scanner hidden input when scanner modal is open
  useEffect(() => {
    if (isScannerOpen) {
      const timer = setTimeout(() => {
        if (hiddenInputRef.current) {
          hiddenInputRef.current.focus();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isScannerOpen]);

  // Keep focus on the hidden scanner input, unless typing in another real input
  useEffect(() => {
    if (!isScannerOpen) return;

    const handleWindowClick = () => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable')
      ) && activeEl !== hiddenInputRef.current;

      if (!isTyping && hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    };

    window.addEventListener('click', handleWindowClick);
    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  }, [isScannerOpen]);

  // Automatically reset scanner and confirmation modal state when scanSuccess is true
  useEffect(() => {
    if (scanSuccess) {
      const timer = setTimeout(() => {
        setSelectedScanStudent(null);
        setScanSuccess(false);
        setScanNotes('');
        setScanStatus('present');
        // Resume any paused QR scanner frames and ensure focus on invisible input
        scanCooldownRef.current = false;
        if (isScannerOpen && hiddenInputRef.current) {
          hiddenInputRef.current.focus();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [scanSuccess, isScannerOpen]);

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
    // Return a stable, deterministic url that never changes even if opened on localhost/dev/prod
    return `https://mathfingers.app/scan?scan_student=${student.id}`;
  };

  const getQrImgSrc = (student: Student, size: number = 200, inkSaver: boolean = false) => {
    const dataUrl = getQrUrl(student);
    // Dark color of QR: Black for inkSaver, emerald color (059669 -> "059669") for premium colored
    const qrColor = inkSaver ? '000000' : '059669';
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dataUrl)}&color=${qrColor}`;
  };

  // Download single student card as official vector PDF matching visual preview
  const handleDownloadSinglePdf = async (student: Student) => {
    if (downloadingPdfId) return;
    setDownloadingPdfId(student.id);
    try {
      await generateStudentQrCardPDF(student, currentUser, notes, false);
    } catch (err) {
      console.error('Error generating single student QR PDF:', err);
      alert('Gagal membuat dokumen PDF kartu QR siswa.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Download all filtered student QR cards into multi-card A4 PDF
  const handleDownloadBatchPdf = async () => {
    if (downloadingBatchPdf || filteredStudents.length === 0) return;
    setDownloadingBatchPdf(true);
    try {
      await generateBatchStudentQrCardsPDF(filteredStudents, currentUser, notes, printInkSaver);
    } catch (err) {
      console.error('Error generating batch student QR PDF:', err);
      alert('Gagal membuat dokumen PDF massal.');
    } finally {
      setDownloadingBatchPdf(false);
    }
  };

  // Generate and download student card as a transparent/high-res PNG matching visual preview
  const handleDownloadCardPng = async (student: Student) => {
    if (downloadingCardId) return;
    setDownloadingCardId(student.id);

    const studentNotes = (notes || []).filter(n => n.studentId === student.id);
    const teacherSignature = getTeacherSignatureName(student, currentUser, studentNotes);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 1120;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Load QR Code Image
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = getQrImgSrc(student, 320);

      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = () => reject(new Error('Failed to load QR code image'));
      });

      // Load Student Photo if available
      let photoImg: HTMLImageElement | null = null;
      if (student.photoUrl) {
        try {
          photoImg = new Image();
          photoImg.crossOrigin = 'anonymous';
          photoImg.src = student.photoUrl;
          await new Promise((resolve) => {
            if (!photoImg) return resolve(false);
            photoImg.onload = () => resolve(true);
            photoImg.onerror = () => resolve(false); // Graceful fallback
          });
        } catch (e) {
          photoImg = null;
        }
      }

      // Clear rect for background
      ctx.clearRect(0, 0, 600, 1120);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 1120);

      // Helper function to draw rounded rectangles
      const drawRoundedRect = (
        x: number, y: number, w: number, h: number, r: number, 
        fill: boolean, stroke: boolean, isDashed: boolean = false
      ) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        
        if (isDashed) {
          ctx.setLineDash([8, 6]);
        } else {
          ctx.setLineDash([]);
        }
        
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
      };

      // 1. Draw outer border (Emerald solid line)
      ctx.strokeStyle = '#059669'; // Emerald-600
      ctx.lineWidth = 5;
      drawRoundedRect(20, 20, 560, 1080, 28, false, true, false);

      // 2. Draw inner border (Emerald-400 dashed line)
      ctx.strokeStyle = '#34d399'; // Emerald-400
      ctx.lineWidth = 2;
      drawRoundedRect(32, 32, 536, 1056, 20, false, true, true);

      // 3. Header: "MATH FINGERS"
      ctx.fillStyle = '#059669';
      ctx.font = '900 36px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MATH FINGERS', 300, 80);

      // 4. Subtitle: "Berhitung Cepat & Akurat Tanpa Alat"
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('Berhitung Cepat & Akurat Tanpa Alat', 300, 104);

      // Badge: KARTU PRESENSI RESMI
      ctx.fillStyle = '#059669';
      drawRoundedRect(190, 116, 220, 26, 8, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('KARTU PRESENSI RESMI', 300, 134);

      // 5. Large Student Photo on Top (Centered & Prominent)
      const photoBoxX = 195;
      const photoBoxY = 156;
      const photoBoxW = 210;
      const photoBoxH = 230;

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      drawRoundedRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH, 20, true, true);

      if (photoImg && photoImg.complete && photoImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        drawRoundedRect(photoBoxX + 3, photoBoxY + 3, photoBoxW - 6, photoBoxH - 6, 18, false, false);
        ctx.clip();
        ctx.drawImage(photoImg, photoBoxX + 3, photoBoxY + 3, photoBoxW - 6, photoBoxH - 6);
        ctx.restore();
      } else {
        ctx.fillStyle = '#059669';
        ctx.font = '900 68px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(student.name.charAt(0).toUpperCase(), 300, photoBoxY + 135);
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillText('Siswa Math Fingers', 300, photoBoxY + 175);
      }

      // 6. Student Name
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 28px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(student.name, 300, 424);

      // 7. Student ID Code Badge
      const idText = `ID: #${getStudentUniqueCode(student)}`;
      ctx.font = 'bold 15px monospace';
      const textWidth = ctx.measureText(idText).width;
      const badgeW = textWidth + 24;
      const badgeH = 28;
      const badgeX = 300 - badgeW / 2;
      const badgeY = 438;

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 6, true, true);

      ctx.fillStyle = '#475569';
      ctx.fillText(idText, 300, 457);

      // 8. Info Details Card
      const infoBoxX = 50;
      const infoBoxY = 478;
      const infoBoxW = 500;
      const infoBoxH = 175;

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      drawRoundedRect(infoBoxX, infoBoxY, infoBoxW, infoBoxH, 12, true, true);

      // Row details
      ctx.font = '16px system-ui, -apple-system, sans-serif';

      // Row 1: Cabang & Kelas
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('Cabang:', infoBoxX + 16, infoBoxY + 34);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(student.branch || 'Pusat', infoBoxX + 90, infoBoxY + 34);

      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText('Kelas:', infoBoxX + 270, infoBoxY + 34);
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(student.kelas || '-', infoBoxX + 325, infoBoxY + 34);

      // Row 2: Level & Status
      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText('Level:', infoBoxX + 16, infoBoxY + 68);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      const lvlText = student.level ? student.level.split(':')[0] : 'Dasar';
      ctx.fillText(lvlText, infoBoxX + 90, infoBoxY + 68);

      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText('Status:', infoBoxX + 270, infoBoxY + 68);
      ctx.fillStyle = student.status === 'active' ? '#059669' : '#64748b';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(student.status === 'active' ? 'Aktif' : 'Nonaktif', infoBoxX + 330, infoBoxY + 68);

      // Row 3: Wali / Orang Tua
      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText('Wali / Ortu:', infoBoxX + 16, infoBoxY + 102);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(student.parentName || '-', infoBoxX + 110, infoBoxY + 102);

      // Row 4: No. Kontak
      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText('No. Kontak:', infoBoxX + 16, infoBoxY + 136);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(student.parentPhone || '-', infoBoxX + 110, infoBoxY + 136);

      // Row 5: Mulai Gabung
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Bergabung:', infoBoxX + 16, infoBoxY + 163);
      ctx.fillStyle = '#475569';
      ctx.fillText(student.joinDate || '-', infoBoxX + 110, infoBoxY + 163);

      // 9. QR Code at Bottom (Prominent Container)
      const qrBoxX = 205;
      const qrBoxY = 668;
      const qrBoxW = 190;
      const qrBoxH = 190;

      ctx.fillStyle = '#f0fdf4';
      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 2;
      drawRoundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 18, true, true, false);

      // Draw loaded QR Code image
      ctx.drawImage(qrImg, qrBoxX + 18, qrBoxY + 12, 154, 154);

      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KODE SCAN PRESENSI', 300, qrBoxY + 180);

      // 10. Parent & Teacher Signature Space
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50, 874);
      ctx.lineTo(550, 874);
      ctx.stroke();

      // Signature Headers
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Orang Tua / Wali Siswa', 170, 898);
      ctx.fillText('Pengajar / Tutor Math Fingers', 430, 898);

      // Signature Lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(80, 990);
      ctx.lineTo(260, 990);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(340, 990);
      ctx.lineTo(520, 990);
      ctx.stroke();

      // Signature Names
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`( ${student.parentName || '................................'} )`, 170, 980);
      ctx.fillText(`( ${teacherSignature} )`, 430, 980);

      // 11. Footer Notice
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('Simpan kartu ini di ID Card holder atau tempel pada buku modul siswa.', 300, 1030);
      ctx.fillText('Math Fingers - Berhitung Cepat & Akurat Tanpa Alat.', 300, 1050);

      // Generate Data URL and Trigger download link
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Kartu_QR_${student.name.replace(/\s+/g, '_')}_MathFingers.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating card PNG:', err);
      alert('Gagal membuat gambar kartu PNG.');
    } finally {
      setDownloadingCardId(null);
    }
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
    if (isScannerOpen) {
      setScanNotification(null);
      scanCooldownRef.current = false;
      if (selectedTab === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
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

      if (scanCooldownRef.current) {
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
              animationFrameRef.current = requestAnimationFrame(scanTick);
              return; // stop current frame, but schedule next frame
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
  const handleScanSuccess = async (decodedData: string) => {
    if (scanCooldownRef.current) return;
    scanCooldownRef.current = true;

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
      // Check for duplicate attendance today
      const todayStr = new Date().toISOString().slice(0, 10);
      const isDuplicate = attendance.some(
        a => a.studentId === matched.id && a.date === todayStr
      );

      if (isDuplicate) {
        // Sound cue (Duplicate warning sound: dual alarm beeps)
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          
          osc1.start();
          osc1.stop(audioCtx.currentTime + 0.1);
          osc2.start(audioCtx.currentTime + 0.15);
          osc2.stop(audioCtx.currentTime + 0.25);
        } catch (e) {}

        // Show warning notification
        setScanNotification({
          name: matched.name,
          type: 'warning',
          message: 'Siswa sudah melakukan presensi hari ini (Scan Ganda)!'
        });

        // Automatically clear and standby in 1.8 seconds
        setTimeout(() => {
          setScanNotification(null);
          scanCooldownRef.current = false;
          // Re-focus the hidden input if modal is still open
          if (isScannerOpen && hiddenInputRef.current) {
            hiddenInputRef.current.focus();
          }
        }, 1800);
        return;
      }

      // Sound cue (High beep for success)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {}

      // Automatically register attendance as present (Hadir)
      try {
        const defaultBranchName = branches[0]?.name || 'Pusat';
        const branchToSet = matched.branch || defaultBranchName;
        
        const record = {
          studentId: matched.id,
          studentName: matched.name,
          date: todayStr,
          status: 'present' as const,
          notes: 'Auto-scanned via QR',
          branch: branchToSet
        };

        if (onAddAttendanceBatch) {
          await onAddAttendanceBatch([record]);
        }

        // Show elegant success notification inside the modal
        setScanNotification({
          name: matched.name,
          type: 'success',
          message: 'Berhasil Presensi Hadir!'
        });
      } catch (err) {
        console.error(err);
        setScanNotification({
          name: matched.name,
          type: 'error',
          message: 'Gagal merekam presensi.'
        });
      }
    } else {
      // Sound cue (Low buzz for error)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 220;
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

      setScanNotification({
        name: decodedData.trim().substring(0, 20),
        type: 'error',
        message: 'Siswa tidak ditemukan!'
      });
    }

    // Automatically clear notification and standby for next scan in 1.8 seconds
    setTimeout(() => {
      setScanNotification(null);
      scanCooldownRef.current = false;
      // Re-focus the hidden input if modal is still open
      if (isScannerOpen && hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }, 1800);
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

  // Hidden scanner physical keyboard emulator submit handler
  const handleHiddenScannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hiddenScannerValue.trim()) return;
    handleScanSuccess(hiddenScannerValue.trim());
    setHiddenScannerValue('');
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
    const studentNotes = (notes || []).filter(n => n.studentId === student.id);
    const teacherSignature = getTeacherSignatureName(student, currentUser, studentNotes);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu Presensi QR - ${student.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 98vh;
              margin: 0;
              background-color: #f8fafc;
              color: #0f172a;
            }
            .card {
              border: 3.5px solid #059669;
              border-radius: 24px;
              padding: 22px 18px 16px 18px;
              width: 360px;
              text-align: center;
              background: #ffffff;
              box-shadow: 0 15px 30px -10px rgba(0, 0, 0, 0.1);
              position: relative;
            }
            .card::before {
              content: '';
              position: absolute;
              inset: 5px;
              border: 1.5px dashed #34d399;
              border-radius: 18px;
              pointer-events: none;
            }
            .logo {
              font-size: 22px;
              font-weight: 900;
              color: #059669;
              margin-bottom: 2px;
              letter-spacing: -0.5px;
              text-transform: uppercase;
            }
            .tagline {
              font-size: 9px;
              color: #64748b;
              font-style: italic;
              margin-bottom: 6px;
            }
            .badge-resmi {
              display: inline-block;
              background-color: #059669;
              color: #ffffff;
              font-size: 8.5px;
              font-weight: 800;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              padding: 3px 12px;
              border-radius: 6px;
              margin-bottom: 10px;
            }
            .photo-container {
              width: 140px;
              height: 155px;
              border: 2.5px solid #059669;
              border-radius: 18px;
              overflow: hidden;
              margin: 4px auto 10px auto;
              background: #f1f5f9;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .student-photo {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
            .photo-placeholder {
              font-size: 48px;
              font-weight: 900;
              color: #059669;
            }
            .student-name {
              font-size: 19px;
              font-weight: 900;
              color: #0f172a;
              margin: 4px 0 2px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .student-code {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 11px;
              font-weight: bold;
              background: #f1f5f9;
              color: #475569;
              padding: 3px 10px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
              display: inline-block;
              margin-bottom: 10px;
            }
            .info-box {
              background: #f8fafc;
              border-radius: 10px;
              padding: 10px 14px;
              font-size: 11px;
              border: 1px solid #e2e8f0;
              text-align: left;
              margin-bottom: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .info-row:last-child {
              margin-bottom: 0;
            }
            .label {
              color: #64748b;
              font-weight: 500;
            }
            .value {
              color: #1e293b;
              font-weight: 700;
            }
            .value-emerald {
              color: #059669;
              font-weight: 800;
            }
            .qr-container {
              background: #f0fdf4;
              border: 1.5px solid #bbf7d0;
              padding: 8px 12px;
              border-radius: 16px;
              display: inline-block;
              margin: 4px auto 8px auto;
            }
            .qr-image {
              width: 120px;
              height: 120px;
              display: block;
              margin: 0 auto;
            }
            .qr-label {
              font-size: 8.5px;
              font-weight: 800;
              color: #065f46;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 4px;
            }
            
            /* Tanda Tangan Section */
            .signature-divider {
              border-top: 1px solid #e2e8f0;
              margin: 10px 0 8px 0;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 4px;
              text-align: center;
            }
            .signature-title {
              font-size: 9px;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 30px;
            }
            .signature-name {
              font-size: 9.5px;
              font-weight: 800;
              color: #0f172a;
              border-top: 1px solid #94a3b8;
              padding-top: 3px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .footer {
              font-size: 8px;
              color: #94a3b8;
              margin-top: 10px;
              font-style: italic;
              line-height: 1.3;
            }
            @media print {
              body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .card { box-shadow: none; border: 3.5px solid #059669; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">Math Fingers</div>
            <div class="tagline">Berhitung Cepat & Akurat Tanpa Alat</div>
            <div class="badge-resmi">Kartu Presensi Resmi</div>
            
            <!-- Large Student Photo on Top -->
            <div class="photo-container">
              ${student.photoUrl 
                ? `<img class="student-photo" src="${student.photoUrl}" alt="${student.name}" />`
                : `<div class="photo-placeholder">${student.name.charAt(0).toUpperCase()}</div>`
              }
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
                <span class="value-emerald">${student.kelas || '-'}</span>
              </div>
              <div class="info-row">
                <span class="label">Level:</span>
                <span class="value">${student.level ? student.level.split(':')[0] : 'Dasar'}</span>
              </div>
              <div class="info-row">
                <span class="label">Wali / Ortu:</span>
                <span class="value">${student.parentName || '-'}</span>
              </div>
              <div class="info-row">
                <span class="label">No. Kontak:</span>
                <span class="value">${student.parentPhone || '-'}</span>
              </div>
            </div>

            <!-- QR Code at Bottom -->
            <div class="qr-container">
              <img class="qr-image" src="${qrSrc}" alt="QR Code" />
              <div class="qr-label">Kode Scan Presensi</div>
            </div>

            <div class="signature-divider"></div>

            <div class="signature-grid">
              <div>
                <div class="signature-title">Orang Tua / Wali Siswa</div>
                <div class="signature-name">( ${student.parentName || '................................'} )</div>
              </div>
              <div>
                <div class="signature-title">Pengajar / Tutor</div>
                <div class="signature-name">( ${teacherSignature} )</div>
              </div>
            </div>

            <div class="footer">Simpan kartu ini di ID Card holder atau tempel pada buku modul siswa.</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
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
          {/* Cabang Filter - Hanya untuk Super Admin */}
          {isSuperAdmin && (
            <CustomDropdown
              value={branchFilter}
              onChange={(val) => setBranchFilter(val)}
              options={[
                { value: 'All', label: 'Semua Cabang' },
                ...availableBranches.map(b => ({ value: b, label: `Cabang: ${b}` }))
              ]}
              theme={theme}
              className="min-w-[140px]"
            />
          )}

          {/* Kelas Filter */}
          <CustomDropdown
            value={classFilter}
            onChange={(val) => setClassFilter(val)}
            options={[
              { value: 'All', label: 'Semua Kelas' },
              ...availableClasses.map(k => ({ value: k, label: `Kelas: ${k}` }))
            ]}
            theme={theme}
            className="min-w-[140px]"
          />

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

                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-emerald-500/20 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.name} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-teal-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-extrabold text-sm sm:text-base truncate ${isLight ? 'text-slate-900' : 'text-white'}`} title={student.name}>
                      {student.name}
                    </h4>
                    <div className="text-[11px] text-slate-450 truncate">
                      Kelas: <span className="text-emerald-500 font-bold">{student.kelas || 'Tanpa Kelas'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-1 space-y-0.5 text-xs text-slate-450 font-medium">
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
          <div className={`rounded-3xl w-full max-w-md shadow-2xl border p-5 sm:p-6 relative my-auto animate-page-fade-in ${
            isLight ? 'bg-white border-slate-200 text-slate-850' : 'bg-[#090d16] border-slate-800 text-white'
          }`}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl transition cursor-pointer"
              title="Tutup Preview"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <QrCode size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Pratinjau Kartu QR Siswa</h3>
                <p className="text-xs text-slate-400">
                  {selectedStudent.name} • #{getStudentUniqueCode(selectedStudent)}
                </p>
              </div>
            </div>

            {/* CARD PREVIEW CANVAS (Large Photo on Top, Details in Middle, QR Code at the Bottom) */}
            <div className="w-full max-w-[320px] mx-auto bg-white border-[3px] border-emerald-600 rounded-3xl p-4 sm:p-5 relative shadow-xl text-center text-slate-900">
              {/* Inner Dashed Border */}
              <div className="absolute inset-1.5 border-[1.5px] border-dashed border-emerald-400 rounded-2xl pointer-events-none" />

              {/* Branding Header */}
              <div className="relative z-10">
                <h3 className="text-emerald-600 font-black text-xl tracking-tight uppercase">Math Fingers</h3>
                <p className="text-[9.5px] text-slate-500 italic -mt-0.5">Berhitung Cepat & Akurat Tanpa Alat</p>
                <span className="inline-block bg-emerald-600 text-white text-[8.5px] font-black uppercase tracking-wider px-3 py-0.5 rounded-md mt-1.5 shadow-xs">
                  Kartu Presensi Resmi
                </span>
              </div>

              {/* Large Student Photo at Top (Prominent & Centered) */}
              <div className="my-3 flex justify-center relative z-10">
                {selectedStudent.photoUrl ? (
                  <div className="w-32 h-36 rounded-2xl overflow-hidden border-[2.5px] border-emerald-500 shadow-md bg-slate-100">
                    <img
                      src={selectedStudent.photoUrl}
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-36 rounded-2xl border-[2.5px] border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-teal-100 flex flex-col items-center justify-center shadow-xs">
                    <span className="text-4xl font-black text-emerald-600">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 mt-1">Siswa Math Fingers</span>
                  </div>
                )}
              </div>

              {/* Student Name and ID */}
              <div className="relative z-10 mb-2">
                <div className="font-black text-lg text-slate-900 truncate" title={selectedStudent.name}>
                  {selectedStudent.name}
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md inline-block mt-0.5">
                  ID: #{getStudentUniqueCode(selectedStudent)}
                </div>
              </div>

              {/* Info Details Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-left text-[11px] space-y-1 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Cabang:</span>
                  <span className="text-slate-900 font-bold">{selectedStudent.branch || 'Pusat'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Kelas:</span>
                  <span className="text-emerald-600 font-black">{selectedStudent.kelas || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Level:</span>
                  <span className="text-slate-700 font-bold truncate max-w-[130px]">
                    {selectedStudent.level ? selectedStudent.level.split(':')[0] : 'Dasar'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Wali / Ortu:</span>
                  <span className="text-slate-900 font-bold truncate max-w-[130px]">
                    {selectedStudent.parentName || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">No. Kontak:</span>
                  <span className="text-slate-700 font-semibold">{selectedStudent.parentPhone || '-'}</span>
                </div>
              </div>

              {/* QR Code at Bottom (Prominent, High-Resolution, Easy to Scan) */}
              <div className="my-3 relative z-10">
                <div className="bg-emerald-50 border border-emerald-300 p-2 rounded-2xl inline-block shadow-sm">
                  <img
                    src={getQrImgSrc(selectedStudent, 260)}
                    alt="QR Code Presensi"
                    className="w-28 h-28 object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-[8.5px] font-black uppercase text-emerald-800 tracking-wider mt-1">
                    Kode Scan Presensi
                  </div>
                </div>
              </div>

              {/* Tanda Tangan Section (Parent & Tutor Signature Space) */}
              <div className="pt-2 border-t border-slate-200 relative z-10">
                <div className="grid grid-cols-2 gap-2 text-center">
                  {/* Parent Signature */}
                  <div>
                    <div className="text-[9px] font-semibold text-slate-500">Orang Tua / Wali Siswa</div>
                    <div className="h-7" />
                    <div className="text-[9.5px] font-extrabold text-slate-900 border-t border-slate-400 pt-0.5 truncate" title={selectedStudent.parentName || 'Orang Tua / Wali'}>
                      ( {selectedStudent.parentName || '................................'} )
                    </div>
                  </div>

                  {/* Tutor Signature (Auto-resolved from branch) */}
                  <div>
                    <div className="text-[9px] font-semibold text-slate-500">Pengajar / Tutor</div>
                    <div className="h-7" />
                    <div className="text-[9.5px] font-extrabold text-slate-900 border-t border-slate-400 pt-0.5 truncate" title={getTeacherSignatureName(selectedStudent, currentUser, (notes || []).filter(n => n.studentId === selectedStudent.id))}>
                      ( {getTeacherSignatureName(selectedStudent, currentUser, (notes || []).filter(n => n.studentId === selectedStudent.id))} )
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Notice */}
              <p className="text-[8px] text-slate-400 italic mt-2 leading-tight relative z-10">
                Simpan kartu ini di ID Card holder atau tempel pada buku modul siswa.
              </p>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-col gap-2 mt-4">
              {/* Primary Download PDF Button */}
              <button
                type="button"
                disabled={downloadingPdfId === selectedStudent.id}
                onClick={() => handleDownloadSinglePdf(selectedStudent)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloadingPdfId === selectedStudent.id ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Menyiapkan PDF Kartu...</span>
                  </>
                ) : (
                  <>
                    <FileText size={15} />
                    <span>Unduh PDF Kartu (Sesuai Preview & Ada TTD)</span>
                  </>
                )}
              </button>

              {/* Secondary Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handlePrintSingle(selectedStudent);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Printer size={13} />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingCardId === selectedStudent.id}
                  onClick={() => handleDownloadCardPng(selectedStudent)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {downloadingCardId === selectedStudent.id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <FileImage size={13} />
                  )}
                  <span>Unduh PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const imgUrl = getQrImgSrc(selectedStudent, 600);
                    const link = document.createElement('a');
                    link.href = imgUrl;
                    link.target = '_blank';
                    link.download = `QR_${selectedStudent.name.replace(/\s+/g, '_')}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Download size={13} />
                  <span>Unduh QR</span>
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

            {/* Actions: Batch PDF & Browser Print */}
            <div className="space-y-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={downloadingBatchPdf}
                onClick={handleDownloadBatchPdf}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {downloadingBatchPdf ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menyiapkan PDF Massal ({filteredStudents.length} Siswa)...</span>
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    <span>Unduh PDF Massal A4 ({filteredStudents.length} Siswa)</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handlePrintBulkExecute}
                  className={`py-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Printer size={13} />
                  <span>Cetak Browser</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCAN QR PRESENSI INTERACTIVE FULLSCREEN MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] w-screen h-screen bg-slate-950 text-white flex flex-col justify-between p-3 sm:p-5 md:p-6 overflow-hidden animate-page-fade-in">
          {/* Header section */}
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <QrCode size={24} />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-xl tracking-tight text-white">Scan QR Absensi Masuk</h3>
                <p className="text-xs text-slate-400">Pindai kartu siswa menggunakan kamera, scanner USB, atau berkas gambar.</p>
              </div>
            </div>

            {/* Mode selection tabs & Close button */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {[
                  { id: 'camera', label: 'Kamera', icon: Camera },
                  { id: 'upload', label: 'Unggah', icon: Upload },
                  { id: 'manual', label: 'Input Manual', icon: Search }
                ].map(tab => {
                  const isSel = selectedTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTab(tab.id as any)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isSel 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  stopCamera();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer shrink-0"
                title="Tutup Scanner"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Invisible form for keyboard-emulated physical USB/Bluetooth scanners */}
          <form onSubmit={handleHiddenScannerSubmit} className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
            <input
              ref={hiddenInputRef}
              type="text"
              value={hiddenScannerValue}
              onChange={(e) => setHiddenScannerValue(e.target.value)}
              className="w-0 h-0 opacity-0 pointer-events-none"
              autoComplete="off"
            />
          </form>

          {/* Real-time scanning feedback overlay */}
          {scanNotification && (
            <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-page-fade-in">
              <div className="w-full max-w-md rounded-3xl shadow-2xl p-8 border border-slate-800 bg-slate-900 flex flex-col items-center justify-center text-center">
                {scanNotification.type === 'success' ? (
                  <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 animate-bounce">
                    <CheckCircle2 size={40} />
                  </div>
                ) : scanNotification.type === 'warning' ? (
                  <div className="w-20 h-20 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 animate-bounce">
                    <AlertCircle size={40} />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center mb-4 animate-bounce">
                    <AlertCircle size={40} />
                  </div>
                )}
                <div className="text-xs uppercase tracking-widest font-extrabold text-slate-400 mb-1.5">
                  {scanNotification.type === 'success' 
                    ? 'PRESENSI BERHASIL' 
                    : scanNotification.type === 'warning' 
                      ? 'DUPLIKAT SCAN' 
                      : 'PRESENSI GAGAL'}
                </div>
                <h4 className="font-black text-2xl tracking-tight text-white mb-2">
                  {scanNotification.name}
                </h4>
                <p className={`text-base font-bold ${
                  scanNotification.type === 'success' 
                    ? 'text-emerald-400' 
                    : scanNotification.type === 'warning' 
                      ? 'text-amber-400' 
                      : 'text-red-400'
                }`}>
                  {scanNotification.message}
                </p>
                
                {/* Auto-standby text and progress dot */}
                <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-950 px-4 py-2 rounded-full border border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Kembali standby untuk scan berikutnya...</span>
                </div>
              </div>
            </div>
          )}

          {/* Body Section: Expands fully on desktop/tablet/mobile */}
          <div className="flex-1 flex flex-col justify-center items-center my-3 relative overflow-hidden w-full">
            {/* TAB: CAMERA ACTIVE STREAM SCAN */}
            {selectedTab === 'camera' && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {scanError ? (
                  <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex gap-3 items-center max-w-lg">
                    <AlertCircle size={24} className="shrink-0" />
                    <div>{scanError}</div>
                  </div>
                ) : (
                  <div ref={videoContainerRef} className="relative w-full h-full max-h-[calc(100vh-180px)] max-w-5xl mx-auto overflow-hidden rounded-3xl border border-slate-800 bg-black flex items-center justify-center shadow-2xl">
                    {/* Hidden canvas for decoder */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Video Camera Stream */}
                    <video
                      ref={videoRef}
                      className="w-full h-full object-contain sm:object-cover"
                      playsInline
                      muted
                    />

                    {/* Full Screen Toggle Button */}
                    <button
                      type="button"
                      onClick={toggleVideoFullscreen}
                      className="absolute top-4 left-4 z-20 bg-slate-900/90 hover:bg-slate-800 active:scale-95 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-black text-white flex items-center gap-2 border border-slate-700 shadow-2xl transition cursor-pointer"
                      title={isFullscreenVideo ? "Keluar Layar Penuh" : "Tampilan Layar Penuh (Full Screen)"}
                    >
                      {isFullscreenVideo ? <Minimize2 size={16} className="text-emerald-400" /> : <Maximize2 size={16} className="text-emerald-400" />}
                      <span>{isFullscreenVideo ? "Layar Normal" : "Full Screen"}</span>
                    </button>

                    {/* Scanning overlay frame lines */}
                    <div className="absolute inset-0 border-2 border-emerald-500/10 pointer-events-none flex items-center justify-center p-4">
                      <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 border-2 border-dashed border-emerald-500/80 rounded-3xl relative shadow-[0_0_50px_rgba(16,185,129,0.15)]">
                        {/* Glowing/pulsing green light line bar */}
                        <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)] animate-pulse" style={{
                          animation: 'scanBar 2s infinite linear'
                        }} />
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs text-slate-200 font-bold flex items-center gap-2 border border-slate-800 shadow-lg">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>Mendeteksi Kode QR Otomatis...</span>
                    </div>

                    {/* Camera Switcher inside Video overlay if multiple */}
                    {cameraDevices.length > 1 && (
                      <div className="absolute top-4 right-4 z-10 max-w-xs">
                        <CustomDropdown
                          value={selectedDeviceId}
                          onChange={(val) => setSelectedDeviceId(val)}
                          options={cameraDevices.map(device => ({
                            value: device.deviceId,
                            label: device.label || `Kamera ${cameraDevices.indexOf(device) + 1}`
                          }))}
                          theme="dark"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPLOAD PICTURE WITH QR CODE */}
            {selectedTab === 'upload' && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="border-2 border-dashed border-slate-800 rounded-3xl p-10 max-w-lg w-full text-center bg-slate-900/60 hover:border-emerald-500/40 transition">
                  <FileImage size={56} className="mx-auto text-emerald-500 mb-4" />
                  <h4 className="text-lg font-black text-white">Unggah Berkas Gambar QR</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">
                    Pilih foto kartu atau gambar modul dari peranti Anda yang memuat kode QR siswa.
                  </p>
                  <label className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs cursor-pointer inline-block transition shadow-lg shadow-emerald-600/20">
                    <span>Pilih Berkas Gambar...</span>
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
              <div className="w-full h-full flex flex-col items-center justify-center max-w-md mx-auto space-y-6">
                <div className="w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kode / ID Siswa</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Scan kartu dengan alat scan atau ketik ID..."
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600 font-mono font-bold"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-3 rounded-xl text-xs shadow-md cursor-pointer transition"
                        >
                          Temukan
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 text-xs text-slate-400 leading-relaxed flex items-start gap-3">
                    <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Saran Penggunaan:</strong> Alat scan kartu USB (Barcode/QR USB Scanner) dapat dipasang langsung ke Laptop atau Tablet. Hubungkan kabelnya, lalu scan kartu QR fisik siswa. Kehadiran akan terdeteksi instan!
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="w-full flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
            <div className="text-xs text-slate-500 hidden sm:block font-medium">
              Mode Layar Penuh • Pindai Otomatis Active
            </div>
            <button
              type="button"
              onClick={() => {
                setIsScannerOpen(false);
                stopCamera();
              }}
              className="w-full sm:w-auto py-2.5 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs border border-slate-800 transition cursor-pointer text-center"
            >
              Tutup Scanner
            </button>
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
