import React, { useState } from 'react';
import { LearningMaterial } from '../types';
import { BookOpen, Sparkles, HelpCircle, Plus, Edit, Trash2, Save, AlertTriangle } from 'lucide-react';

interface MaterialListProps {
  materials: LearningMaterial[];
  onAddMaterial: (data: Omit<LearningMaterial, 'id'>) => Promise<void>;
  onUpdateMaterial: (id: string, data: Partial<LearningMaterial>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  theme?: string;
}

export function MaterialList({ 
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
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

  const activeMaterial = materials.find(m => m.id === selectedMatId) || materials[0];

  const handleOpenAddForm = () => {
    setFormMode('add');
    setEditMatId(null);
    setLevel(`Level ${materials.length + 1}: `);
    setTitle('');
    setDescription('');
    setFormulasText('');
    setStepsText('');
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
    setIsFormOpen(true);
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
      steps
    };

    if (formMode === 'add') {
      await onAddMaterial(materialData);
      // Auto-select newly created material if possible (or we wait for re-render)
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
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>Daftar Materi & Kurikulum</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Kelola silabus materi bimbingan Jaritmatika, simpan formula, dan panduan latihan siswa.</p>
        </div>
        
        <button
          id="btn-add-material"
          onClick={handleOpenAddForm}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl transition duration-150 shadow-sm"
        >
          <Plus size={18} />
          <span>Tambah Materi Baru</span>
        </button>
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
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tingkatan Silabus</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {materials.map((mat) => {
                const levelNum = mat.level.match(/\d+/)?.[0] || '1';
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
                      {levelNum}
                    </div>
                    
                    <div className="flex-1 min-w-0 font-sans">
                      <div className="text-xs font-semibold text-slate-400 font-mono tracking-wider">LEVEL {levelNum}</div>
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
    </div>
  );
}
