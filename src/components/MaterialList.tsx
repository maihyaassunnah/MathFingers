import React, { useState } from 'react';
import { LearningMaterial } from '../types';
import { BookOpen, Sparkles, HelpCircle, Plus, Edit, Trash2, Save, AlertTriangle, Video, Image as ImageIcon, ExternalLink, Eye, X, Film, Upload } from 'lucide-react';

function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) 
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
}

function compressAndResizeImage(file: File, maxWidth: number = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPEG format with 0.7 quality gives high quality but tiny storage footprint
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

interface MaterialListProps {
  materials: LearningMaterial[];
  onAddMaterial: (data: Omit<LearningMaterial, 'id'>) => Promise<void>;
  onUpdateMaterial: (id: string, data: Partial<LearningMaterial>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  onClearMaterials?: () => Promise<void>;
  theme?: string;
}

export function MaterialList({ 
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onClearMaterials,
  theme = 'dark'
}: MaterialListProps) {
  const [selectedMatId, setSelectedMatId] = useState<string>(materials[0]?.id || '');
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editMatId, setEditMatId] = useState<string | null>(null);

  // Form fields
  const [level, setLevel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formulasText, setFormulasText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [tutorialImages, setTutorialImages] = useState<string[]>([]);
  
  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // Gallery Preview overlay state
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);

  const activeMaterial = materials.find(m => m.id === selectedMatId) || materials[0];

  const handleOpenAddForm = () => {
    setFormMode('add');
    setEditMatId(null);
    setLevel(`Level ${materials.length + 1}: `);
    setTitle('');
    setDescription('');
    setFormulasText('');
    setStepsText('');
    setVideoUrl('');
    setTutorialImages([]);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (mat: LearningMaterial) => {
    setFormMode('edit');
    setEditMatId(mat.id);
    setLevel(mat.level);
    setTitle(mat.title);
    setDescription(mat.description);
    setFormulasText(mat.formulas.join('\n'));
    setStepsText(mat.steps.join('\n'));
    setVideoUrl(mat.videoUrl || '');
    setTutorialImages(mat.tutorialImages || []);
    setIsFormOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const processFiles = async (files: FileList) => {
    const newImages = [...tutorialImages];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar (JPEG, PNG, GIF, dll.)');
        continue;
      }
      try {
        const compressed = await compressAndResizeImage(file);
        newImages.push(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
    setTutorialImages(newImages);
  };

  const removeUploadedImage = (indexToRemove: number) => {
    setTutorialImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!level || !title) {
      alert('Mohon isi Level dan Judul Materi!');
      return;
    }

    const formulas = formulasText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

    const steps = stepsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

    const materialData = {
      level,
      title,
      description,
      formulas,
      steps,
      videoUrl: videoUrl.trim(),
      tutorialImages
    };

    if (formMode === 'add') {
      await onAddMaterial(materialData);
    } else if (formMode === 'edit' && editMatId) {
      await onUpdateMaterial(editMatId, materialData);
    }

    setIsFormOpen(false);
  };

  const handleDelete = async (mat: LearningMaterial) => {
    if (confirm(`Apakah Anda yakin ingin menghapus materi "${mat.title}"?`)) {
      await onDeleteMaterial(mat.id);
      // Fallback selection
      const remaining = materials.filter(m => m.id !== mat.id);
      if (remaining.length > 0) {
        setSelectedMatId(remaining[0].id);
      } else {
        setSelectedMatId('');
      }
    }
  };

  const isLight = theme === 'light';

  return (
    <div id="material-list-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Kurikulum & Silabus</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Kelola silabus materi bimbingan Jaritmatika, simpan formula, dan panduan latihan siswa.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {materials.length > 0 && onClearMaterials && (
            <button
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin menghapus semua materi kurikulum? Tindakan ini tidak dapat dibatalkan.')) {
                  onClearMaterials();
                }
              }}
              className="flex items-center justify-center gap-2 border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 font-semibold px-4 py-2.5 rounded-xl transition duration-150"
            >
              <Trash2 size={18} />
              <span>Kosongkan Kurikulum</span>
            </button>
          )}
          
          <button
            id="btn-add-material"
            onClick={handleOpenAddForm}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
          >
            <Plus size={18} />
            <span>Tambah Materi Baru</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      {materials.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <BookOpen size={48} className="mx-auto text-slate-500 mb-3" />
          <p className="font-semibold text-slate-400">Belum ada materi terdaftar</p>
          <p className="text-xs text-slate-500 mt-1">Gunakan tombol tambah di atas untuk membuat materi pertamamu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Level List Navigation Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Daftar Modul Silabus</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {materials.map((mat, idx) => {
                const isActive = selectedMatId === mat.id || (!selectedMatId && activeMaterial?.id === mat.id);

                return (
                  <button
                    key={mat.id}
                    onClick={() => setSelectedMatId(mat.id)}
                    className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-3.5 ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : isLight 
                          ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center font-mono text-sm flex-shrink-0 ${
                      isActive 
                        ? 'bg-emerald-500 text-white dark:text-slate-950' 
                        : 'bg-slate-200 dark:bg-slate-950/60 text-slate-500'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0 font-sans">
                      <div className="text-xs font-semibold text-slate-400 font-mono tracking-wider truncate">
                        Kategori: {mat.level || 'Umum'}
                      </div>
                      <div className={`font-bold truncate text-sm mt-0.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>{mat.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level Details View Card */}
          {activeMaterial && (
            <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-sm space-y-6 flex flex-col justify-between ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="space-y-6">
                
                {/* Header view with action buttons */}
                <div className={`border-b pb-4 flex items-start justify-between gap-4 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md mb-2">
                      <BookOpen size={12} />
                      <span>{activeMaterial.level}</span>
                    </span>
                    <h3 className={`text-xl font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{activeMaterial.title}</h3>
                    <p className={`text-sm mt-1.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{activeMaterial.description}</p>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEditForm(activeMaterial)}
                      className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-slate-500/10 rounded-xl transition"
                      title="Edit Materi"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(activeMaterial)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                      title="Hapus Materi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Formulas sheet */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Formula Jari / Formasi Rumus</h4>
                  {activeMaterial.formulas && activeMaterial.formulas.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeMaterial.formulas.map((formula, idx) => (
                        <div key={idx} className={`flex items-center gap-2.5 p-3 border rounded-xl ${
                          isLight ? 'bg-slate-50 border-slate-150' : 'bg-slate-950/40 border-slate-800'
                        }`}>
                          <div className="w-5 h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-mono text-xs font-bold">
                            =
                          </div>
                          <span className={`text-sm font-semibold font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{formula}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Tidak ada formula khusus untuk level ini.</p>
                  )}
                </div>

                {/* Practicing Steps list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Langkah-Langkah Latihan</h4>
                  {activeMaterial.steps && activeMaterial.steps.length > 0 ? (
                    <div className="space-y-3">
                      {activeMaterial.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold mt-0.5 ${
                            isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-950/60 text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{step}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Belum ada langkah latihan tertulis.</p>
                  )}
                </div>

                {/* Tutorial Video Section */}
                {activeMaterial.videoUrl && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Video size={14} className="text-emerald-500" />
                      <span>Video Tutorial Bimbingan</span>
                    </h4>
                    {getYoutubeEmbedUrl(activeMaterial.videoUrl) ? (
                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative bg-black">
                        <iframe
                          className="w-full h-full"
                          src={getYoutubeEmbedUrl(activeMaterial.videoUrl)!}
                          title={`Video Tutorial - ${activeMaterial.title}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <a
                        href={activeMaterial.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center justify-between p-4 rounded-xl border transition ${
                          isLight 
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' 
                            : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                            <Video size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">Buka Video Tutorial Eksternal</p>
                            <p className="text-xs text-slate-500 truncate">{activeMaterial.videoUrl}</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-slate-400 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                )}

                {/* Tutorial Photo Gallery */}
                {activeMaterial.tutorialImages && activeMaterial.tutorialImages.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-emerald-500" />
                      <span>Foto-Foto Tutorial & Ilustrasi Jari</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {activeMaterial.tutorialImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedFullImage(imgUrl)}
                          className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Langkah ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=400";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                            <span className="text-white text-xs font-semibold bg-black/60 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                              <Eye size={12} />
                              <span>Perbesar</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick info tip footer */}
              <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 text-xs text-amber-700 dark:text-amber-300/90 flex gap-2.5 mt-6">
                <HelpCircle size={16} className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">Pedoman Pengajaran:</span> Guru diharapkan menggunakan media visual serta merangsang konsentrasi refleks anak melalui kuis instan di menu evaluasi.
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* CRUD Add/Edit Dialog Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-2xl shadow-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#020617] border-slate-800'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'} flex items-center gap-2`}>
                <Sparkles className="text-emerald-500" size={18} />
                <span>{formMode === 'add' ? 'Tambah Materi & Kurikulum Baru' : 'Edit Silabus Materi'}</span>
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white font-medium text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Label Tingkatan (Level) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Level 1: Dasar Satuan"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Judul Pokok Bahasan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pengenalan Jari Kanan"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsikan secara garis besar apa yang dipelajari pada level ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-850' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Formula Jari (Satu per baris)
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1.5">Tekan Enter untuk membuat rumus baru.</p>
                  <textarea
                    rows={4}
                    placeholder="Jempol Kanan = 5&#10;Telunjuk Kanan = 1"
                    value={formulasText}
                    onChange={(e) => setFormulasText(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-850' : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Langkah Latihan (Satu per baris)
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1.5">Tekan Enter untuk baris instruksi baru.</p>
                  <textarea
                    rows={4}
                    placeholder="Latih tangan kanan tertutup melambangkan 0&#10;Buka telunjuk untuk nilai 1"
                    value={stepsText}
                    onChange={(e) => setStepsText(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs leading-relaxed ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-850' : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Link Video Tutorial (YouTube, Drive, dll)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Video size={15} />
                  </span>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Foto-Foto Tutorial & Ilustrasi Jari (Upload File)
                </label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 relative ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : isLight
                        ? 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/60'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80'
                  }`}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs font-bold text-slate-300">
                      Tarik & lepas file gambar di sini, atau <span className="text-emerald-450 hover:underline">pilih file dari komputer</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Format PNG, JPG, JPEG, atau GIF. Kompresi otomatis aktif untuk menghemat ruang.
                    </p>
                  </div>
                </div>

                {/* Thumbnails of currently selected files */}
                {tutorialImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3">
                    {tutorialImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 dark:border-slate-800 bg-black/20">
                        <img
                          src={imgUrl}
                          alt={`Langkah ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUploadedImage(idx);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-red-500"
                          title="Hapus gambar"
                        >
                          <X size={10} />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 text-center truncate px-1">
                          Gambar {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`pt-4 border-t flex gap-3 justify-end ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-xl transition shadow-sm"
                >
                  <Save size={14} />
                  <span>{formMode === 'add' ? 'Simpan Materi' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Image Overlay modal */}
      {selectedFullImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedFullImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-950 flex flex-col items-center justify-center shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedFullImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition shadow-md"
            >
              <X size={18} />
            </button>
            <img 
              src={selectedFullImage} 
              alt="Tutorial Full Screen" 
              className="max-w-full max-h-[80vh] object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800";
              }}
            />
            <div className="p-3 text-center text-slate-300 text-xs font-mono select-all break-all w-full bg-slate-900 border-t border-slate-800">
              {selectedFullImage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
