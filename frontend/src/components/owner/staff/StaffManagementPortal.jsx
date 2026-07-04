import React, { useState, useEffect } from 'react';
import { getSalesmen, getOperators, registerUser, updateUser, deleteUser } from '../../../api/userApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function StaffManagementPortal() {
  const navigate = useNavigate();
  // --- STATE FOR MANAGING THE ACTIVE MODAL FORM LAYER ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- LOCAL FORM FIELDS BUFFER STATE ---
  const [formData, setFormData] = useState({ name: '', email: '', code: '', role: 'Salesman' });

  // Staff Master Roster
  const [staffRoster, setStaffRoster] = useState([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const salesmen = await getSalesmen();
      const operators = await getOperators();
      
      const mappedSalesmen = salesmen.map(s => ({
        ...s,
        code: s.salesmanId || 'N/A',
        role: 'Salesman'
      }));
      
      const mappedOperators = operators.map(o => ({
        ...o,
        code: `OP-${o._id.substring(o._id.length - 4).toUpperCase()}`,
        role: 'Operator'
      }));

      setStaffRoster([...mappedSalesmen, ...mappedOperators]);
    } catch (error) {
      console.error("Failed to fetch staff list:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({ name: '', email: '', code: '', role: 'Salesman' });
    setIsFormModalOpen(true);
  };

  const openEditModal = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({ 
      name: staffMember.name, 
      email: staffMember.email, 
      code: staffMember.code, 
      role: staffMember.role 
    });
    setIsFormModalOpen(true);
  };

  const handleSafeDeleteRequest = (staffMember) => {
    setStaffToDelete(staffMember);
  };

  const confirmDeleteAction = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(staffToDelete._id);
      setStaffRoster(prev => prev.filter(item => item._id !== staffToDelete._id));
      toast.success("User deleted successfully.");
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user. Ensure they exist and try again.");
    } finally {
      setIsDeleting(false);
      setStaffToDelete(null);
    }
  };

  const handleCommitFormSubmission = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || (formData.role === 'Salesman' && !formData.code.trim())) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    if (editingStaff) {
      try {
        const payload = {
          name: formData.name,
          email: formData.email,
          role: formData.role.toLowerCase(),
          salesmanId: formData.role === 'Salesman' ? formData.code : undefined
        };
        await updateUser(editingStaff._id, payload);
        await fetchStaff();
        setIsFormModalOpen(false);
        toast.success("User profile updated successfully.");
      } catch (error) {
        console.error("Failed to update user:", error);
        toast.error(error.response?.data?.error || "Error updating user.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // INGESTION NEW PROFILE: Call Backend API
      try {
        const payload = {
          name: formData.name,
          email: formData.email,
          role: formData.role.toLowerCase(), // Backend expects "operator" or "salesman"
          salesmanId: formData.role === 'Salesman' ? formData.code : undefined
        };
        
        await registerUser(payload);
        
        // Refresh the roster to show the newly created user with their real DB _id
        await fetchStaff();
        setIsFormModalOpen(false);
        toast.success("New user created successfully.");
      } catch (error) {
        console.error("Failed to register user:", error);
        toast.error(error.response?.data?.error || "Error creating user. They might already exist.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80 shadow-sm relative pb-20">
      
      {/* Persistent Dashboard Section Header Layout */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center gap-x-4 z-10 shadow-2xs">
        <button type="button" onClick={() => navigate('/owner')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Manage Staff Accounts</h2>
          <p className="text-[11px] text-slate-400">Configure agency user profiles, system roles, and authorization keys</p>
        </div>
      </div>

      {/* Roster Cards Listing Stream Feed */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 mt-10 animate-pulse">Loading Staff Roster...</div>
        ) : staffRoster.length === 0 ? (
          <div className="text-center text-slate-400 mt-10">No staff accounts found.</div>
        ) : (
          staffRoster.map((staff) => (
            <div 
              key={staff._id}
              className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-3xs flex items-center justify-between gap-x-4 transition-all hover:border-slate-300"
            >
              {/* Left Side: Avatar Bracket & Profile Credentials */}
              <div className="flex items-center gap-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                  {staff.name.charAt(0)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-x-2">
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">{staff.name}</h4>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border tracking-wide ${
                      staff.role === 'Salesman' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100/50' 
                        : 'bg-slate-100 text-slate-600 border-slate-200/60'
                    }`}>
                      {staff.role}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-medium text-slate-400 tracking-tight">System ID: {staff.code}</p>
                </div>
              </div>

              {/* Right Side: Split Action System Control Buttons */}
              <div className="flex items-center gap-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(staff)}
                  className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all duration-150"
                  aria-label="Edit Profile"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleSafeDeleteRequest(staff)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all duration-150"
                  aria-label="Delete Profile"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* --- FLOATING ACTION BUTTON (FAB) INTERFACE WINDOW --- */}
      <button
        type="button"
        onClick={openCreateModal}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-fit max-w-[calc(100%-2rem)] md:absolute h-12 px-4 bg-indigo-950 hover:bg-indigo-900 active:bg-slate-900 text-white text-xs font-black tracking-wider uppercase rounded-full shadow-lg hover:shadow-xl transition-all duration-150 z-40 flex items-center justify-center gap-x-1.5 border border-indigo-900/40"
      >
        <span className="text-sm font-light leading-none">&#43;</span>
        <span>New Staff</span>
      </button>

      {/* --- UNIFIED PROFILE SETUP MODAL DIALOG OVERLAY --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {editingStaff ? "Update Staff Profile" : "Onboard New Staff Member"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {editingStaff ? "Modify existing data clearance keys" : "Initialize configuration variables for fresh user accounts"}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-medium p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Form Submission Area */}
            <form onSubmit={handleCommitFormSubmission} className="p-5 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Member Full Name</label>
                <input
                  type="text" required placeholder="e.g., K. Ramesh Rao"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* NEW EMAIL INPUT BOX */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email" required placeholder="e.g., agent@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {formData.role === 'Salesman' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique Security Staff Code</label>
                  <input
                    type="text" required={formData.role === 'Salesman'} placeholder="e.g., M-SR-04"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Functional Authorization Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                >
                  <option value="Salesman">Field Salesman Agent</option>
                  <option value="Operator">Warehouse Operator Desk</option>
                </select>
              </div>

              <div className="flex items-center gap-x-2.5 pt-2.5">
                <button
                  type="button" onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-x-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs"
                >
                  {isSubmitting && (
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span>{isSubmitting ? "Processing..." : (editingStaff ? "Save Overrides" : "Initialize Account")}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM DELETION MODAL --- */}
      {staffToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-rose-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Delete Account?</h3>
            <p className="text-sm text-slate-500 font-medium">
              Are you absolutely sure you want to delete <span className="text-slate-800 font-bold">{staffToDelete.name} ({staffToDelete.code})</span>?
              <br/><br/>
              This will permanently remove the user from the database.
            </p>

            <div className="flex items-center gap-x-2 mt-4">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setStaffToDelete(null)}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteAction}
                className="flex-1 flex justify-center items-center gap-x-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs border border-rose-700/50"
              >
                {isDeleting && (
                  <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>{isDeleting ? "Deleting..." : "Delete User"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}