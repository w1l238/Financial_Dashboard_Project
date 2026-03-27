"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout, { useDashboard } from '@/components/layout/DashboardLayout';
import { api, UserResponse, UserUpdateAdmin } from '@/lib/api';
import { 
  Users, 
  Search, 
  UserCog, 
  Shield, 
  Trash2, 
  Key, 
  X, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * User Management Page for Administrators.
 * Provides CRUD operations for all system users.
 */
const USERS_PER_PAGE = 10;

export default function AdminPage() {
  const { userPrefs } = useDashboard();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  const fetchUsers = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const { users: data, total } = await api.listAllUsers(page, USERS_PER_PAGE);
      setUsers(data);
      setTotalUsers(total);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userPrefs?.role === 'admin') {
      fetchUsers(1);
    }
  }, [userPrefs, fetchUsers]);

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    try {
      await api.adminDeleteUser(userId);
      // Refresh current page; if last item on page, go back one page
      const newPage = users.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      fetchUsers(newPage);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      alert(message);
    }
  };

  const handleEditUser = (user: UserResponse) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userPrefs && userPrefs.role !== 'admin') {
    return (
      <DashboardLayout title="Access Denied">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center text-rose-500 mb-4">
            <Shield className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Unauthorized Access</h2>
          <p className="text-slate-500 max-w-sm">You do not have the administrative privileges required to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-3 text-blue-600">
            <Users className="w-6 h-6" />
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Active Users</h3>
            <span className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">{totalUsers}</span>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by username or name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border-0 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {loading ? (
                  [1,2,3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-8 py-6 h-20 bg-slate-50/30 dark:bg-slate-900/30" />
                    </tr>
                  ))
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-blue-600">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{user.username}</span>
                          <span className="text-xs text-slate-500 font-medium">{user.full_name || "No name set"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3" />}
                        <span>{user.role}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Stocks</span>
                          <span className="text-xs font-bold">{user.tracked_stocks.length}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Cities</span>
                          <span className="text-xs font-bold">{user.weather_locations.length}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        >
                          <UserCog className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === userPrefs?.id}
                          className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Page {currentPage} of {totalPages} &mdash; {totalUsers} users total
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchUsers(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchUsers(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <UserEditModal 
            user={selectedUser} 
            onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }} 
            onSuccess={() => { setIsEditModalOpen(false); setSelectedUser(null); fetchUsers(currentPage); }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function UserEditModal({ user, onClose, onSuccess }: { user: UserResponse, onClose: () => void, onSuccess: () => void }) {
  const { userPrefs } = useDashboard();
  const isSelf = userPrefs?.id === user.id;
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap and Escape-to-close for accessibility
  useEffect(() => {
    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [formData, setFormData] = useState<UserUpdateAdmin>({
    username: user.username,
    full_name: user.full_name || '',
    role: user.role,
    password: '',
    current_password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // Don't send empty fields
      const submitData = { ...formData };
      if (!submitData.password) {
        delete submitData.password;
        delete submitData.current_password;
      }
      if (isSelf) delete submitData.username; // Prevent sending username on self-update
      
      await api.adminUpdateUser(user.id, submitData);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-edit-modal-title"
      ref={dialogRef}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                <UserCog className="w-6 h-6" />
              </div>
              <div>
                <h3 id="user-edit-modal-title" className="text-xl font-bold tracking-tight">{isSelf ? 'My Account' : 'Edit Profile'}</h3>
                <p className="text-xs text-slate-500 font-medium">Managing account for @{user.username}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close edit profile" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</label>
                  {isSelf && <span className="text-[8px] font-bold text-slate-400 uppercase italic">Immutable</span>}
                </div>
                <input 
                  type="text" 
                  disabled={isSelf}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-50 dark:border-slate-800/50">
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isSelf ? 'New Password' : 'Reset Password'}
                  </label>
                  <span className="text-[10px] font-bold text-blue-500 uppercase italic">Leave blank to keep current</span>
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    placeholder={isSelf ? "Enter new password..." : "Enter reset password..."}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>

              {isSelf && formData.password && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest px-1">Current Password Required</label>
                  <div className="relative">
                    <Check className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      required
                      placeholder="Confirm current password..."
                      value={formData.current_password}
                      onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-rose-200 dark:border-rose-900 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
