import React, { useState } from 'react';
import { Branch, AdminUser } from '../types';
import { Building, UserPlus, Users, Trash2, Edit2, ShieldAlert, Plus, Shield, Check, Lock, MapPin, Phone, RefreshCw } from 'lucide-react';

interface BranchesManagerProps {
  theme: 'light' | 'dark';
  branches: Branch[];
  adminUsers: AdminUser[];
  onAddBranch: (branchData: Omit<Branch, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateBranch: (id: string, updatedFields: Partial<Branch>) => Promise<void>;
  onDeleteBranch: (id: string) => Promise<void>;
  onAddAdminUser: (userData: AdminUser) => Promise<void>;
  onUpdateAdminUser: (username: string, updatedFields: Partial<AdminUser>) => Promise<void>;
  onDeleteAdminUser: (username: string) => Promise<void>;
}

export function BranchesManager({
  theme,
  branches = [],
  adminUsers = [],
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
  onAddAdminUser,
  onUpdateAdminUser,
  onDeleteAdminUser
}: BranchesManagerProps) {
  const isLight = theme === 'light';

  // Branch form state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Admin User form state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState<'super_admin' | 'branch_admin'>('branch_admin');
  const [adminBranch, setAdminBranch] = useState('Pusat');
  const [adminPassword, setAdminPassword] = useState('');
  const [editingAdminUsername, setEditingAdminUsername] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'admins'>('branches');

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    try {
      if (editingBranchId) {
        await onUpdateBranch(editingBranchId, {
          name: branchName.trim(),
          address: branchAddress.trim(),
          phone: branchPhone.trim()
        });
      } else {
        await onAddBranch({
          name: branchName.trim(),
          address: branchAddress.trim(),
          phone: branchPhone.trim()
        });
      }

      // Reset form
      setBranchName('');
      setBranchAddress('');
      setBranchPhone('');
      setEditingBranchId(null);
      setShowBranchModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminName.trim() || !adminPassword.trim()) return;

    try {
      const payload: AdminUser = {
        username: adminUsername.trim().toLowerCase(),
        name: adminName.trim(),
        role: adminRole,
        branch: adminBranch,
        password: adminPassword.trim()
      };

      if (editingAdminUsername) {
        await onUpdateAdminUser(editingAdminUsername, payload);
      } else {
        await onAddAdminUser(payload);
      }

      // Reset form
      setAdminUsername('');
      setAdminName('');
      setAdminRole('branch_admin');
      setAdminPassword('');
      setEditingAdminUsername(null);
      setShowAdminModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const startEditBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setBranchName(branch.name);
    setBranchAddress(branch.address || '');
    setBranchPhone(branch.phone || '');
    setShowBranchModal(true);
  };

  const startEditAdmin = (admin: AdminUser) => {
    setEditingAdminUsername(admin.username);
    setAdminUsername(admin.username);
    setAdminName(admin.name);
    setAdminRole(admin.role);
    setAdminBranch(admin.branch);
    setAdminPassword(admin.password || '');
    setShowAdminModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Building className="text-emerald-500" />
            <span>Manajemen Multi-Cabang & Admin</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Pantau dan kelola cabang privat les Math Fingers serta hak akses akun administrator cabang Anda secara aman.
          </p>
        </div>

        {/* Action Button */}
        {activeSubTab === 'branches' ? (
          <button
            onClick={() => {
              setEditingBranchId(null);
              setBranchName('');
              setBranchAddress('');
              setBranchPhone('');
              setShowBranchModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/10"
            id="add-branch-btn"
          >
            <Plus size={16} />
            <span>Tambah Cabang Baru</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setEditingAdminUsername(null);
              setAdminUsername('');
              setAdminName('');
              setAdminRole('branch_admin');
              setAdminPassword('');
              if (branches.length > 0) setAdminBranch(branches[0].name);
              setShowAdminModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/10"
            id="add-admin-btn"
          >
            <UserPlus size={16} />
            <span>Tambah Akun Admin</span>
          </button>
        )}
      </div>

      {/* Sub-Tabs Nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab('branches')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
            activeSubTab === 'branches'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Daftar Cabang ({branches.length})
        </button>
        <button
          onClick={() => setActiveSubTab('admins')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
            activeSubTab === 'admins'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Akun Admin ({adminUsers.length})
        </button>
      </div>

      {/* Main List Area */}
      {activeSubTab === 'branches' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => {
            // Count total students in this branch
            const adminCount = adminUsers.filter(u => u.branch === branch.name).length;

            return (
              <div
                key={branch.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isLight ? 'bg-white border-slate-150' : 'bg-slate-900 border-slate-800'
                }`}
                id={`branch-card-${branch.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/40 text-emerald-400'}`}>
                    <Building size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditBranch(branch)}
                      className="text-slate-400 hover:text-emerald-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit Cabang"
                    >
                      <Edit2 size={14} />
                    </button>
                    {branch.name !== 'Pusat' && (
                      <button
                        onClick={() => {
                          if (confirm(`Apakah Anda yakin ingin menghapus Cabang "${branch.name}"? Ini tidak akan menghapus data siswa melainkan memutus koordinasi cabang.`)) {
                            onDeleteBranch(branch.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Hapus Cabang"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold mt-4 text-slate-850 dark:text-white">{branch.name}</h3>
                
                <div className="space-y-2 mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <span>{branch.address || 'Alamat belum disetel'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span>{branch.phone || 'Telepon belum disetel'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <span>{adminCount} Akun Admin Terdaftar</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={isLight ? 'bg-slate-50 border-b border-slate-150 text-slate-500' : 'bg-slate-950 border-b border-slate-800 text-slate-400'}>
                <th className="p-4 font-bold uppercase tracking-wider">Nama Admin</th>
                <th className="p-4 font-bold uppercase tracking-wider">Username</th>
                <th className="p-4 font-bold uppercase tracking-wider">Cabang Tugas</th>
                <th className="p-4 font-bold uppercase tracking-wider">Peran (Role)</th>
                <th className="p-4 font-bold uppercase tracking-wider">Sandi Demo</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
              {adminUsers.map((admin) => {
                const isSuper = admin.role === 'super_admin';
                return (
                  <tr
                    key={admin.username}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    <td className="p-4 font-bold">{admin.name}</td>
                    <td className="p-4 font-mono">{admin.username}</td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {admin.branch}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                        isSuper 
                          ? 'bg-indigo-500/10 text-indigo-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        <Shield size={10} />
                        <span>{isSuper ? 'Super Admin' : 'Admin Cabang'}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{admin.password || '••••••'}</td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => startEditAdmin(admin)}
                        className="text-slate-400 hover:text-emerald-500 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex"
                        title="Edit Admin"
                      >
                        <Edit2 size={13} />
                      </button>
                      {admin.username !== 'febrianti' && (
                        <button
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus akun admin "${admin.name}"?`)) {
                              onDeleteAdminUser(admin.username);
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex"
                          title="Hapus Admin"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- BRANCH MODAL DIALOG --- */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative overflow-hidden ${
            isLight ? 'bg-white border-slate-150' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Building className="text-emerald-500" />
              <span>{editingBranchId ? 'Sunting Cabang' : 'Tambah Cabang Baru'}</span>
            </h3>

            <form onSubmit={handleBranchSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Cabang</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Contoh: Bandung, Surabaya"
                  className={`w-full px-4.5 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
                <textarea
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Ketik alamat operasional cabang..."
                  rows={2}
                  className={`w-full px-4.5 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kontak Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="Contoh: 08123456780"
                  className={`w-full px-4.5 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl border transition ${
                    isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/10"
                >
                  {editingBranchId ? 'Simpan Perubahan' : 'Tambah Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN MODAL DIALOG --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative overflow-hidden ${
            isLight ? 'bg-white border-slate-150' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <UserPlus className="text-emerald-500" />
              <span>{editingAdminUsername ? 'Sunting Akun Admin' : 'Buat Akun Admin Baru'}</span>
            </h3>

            <form onSubmit={handleAdminSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Lengkap Administrator</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className={`w-full px-4.5 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username Unik (Sesi Masuk)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingAdminUsername}
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Contoh: budi_les, jakarta_admin"
                  className={`w-full px-4.5 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    editingAdminUsername ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kata Sandi (Demo/Keamanan)</label>
                <input
                  type="text"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Ketik sandi masuk..."
                  className={`w-full px-4.5 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Peran Hak Akses</label>
                  <select
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value as any)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                    }`}
                  >
                    <option value="branch_admin">Admin Cabang</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cabang Penempatan</label>
                  <select
                    value={adminBranch}
                    onChange={(e) => setAdminBranch(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-850' : 'bg-slate-950/50 border-slate-800 text-white'
                    }`}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl border transition ${
                    isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/10"
                >
                  {editingAdminUsername ? 'Simpan Akun' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
