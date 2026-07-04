import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { Receipt, CheckCircle, Clock, AlertTriangle, IndianRupee, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpiPaymentEntry({ salesman }) {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [utrDigits, setUtrDigits] = useState(['', '', '', '', '']);
  const inputRefs = [React.useRef(), React.useRef(), React.useRef(), React.useRef(), React.useRef()];
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tab & Draft state
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'previous'
  const [deletingId, setDeletingId] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });

  const showConfirm = (title, message, onConfirm) => setModalConfig({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const showAlert = (title, message) => setModalConfig({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const pendingPayments = payments.filter(p => !p.isSubmittedToOwner);
  const allPrevious = payments.filter(p => p.isSubmittedToOwner);
  
  const isOwnerTallying = allPrevious.some(p => !p.isArchivedByOwner);

  let previousPayments = [];
  if (isOwnerTallying) {
    previousPayments = allPrevious.filter(p => !p.isArchivedByOwner);
  } else {
    const archived = allPrevious.filter(p => p.isArchivedByOwner && p.archivedAt);
    if (archived.length > 0) {
      const maxDate = new Date(Math.max(...archived.map(p => new Date(p.archivedAt))));
      previousPayments = archived.filter(p => Math.abs(new Date(p.archivedAt) - maxDate) < 5000);
    }
  }

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  useEffect(() => {
    if (!salesman) {
      navigate('/salesman');
      return;
    }
    fetchData();
  }, [salesman, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/upi/salesman/payments', {
        params: { salesmanId: salesman._id }
      });
      setPayments(res.data.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleUtrChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...utrDigits];
    newDigits[index] = value.substring(value.length - 1);
    setUtrDigits(newDigits);
    
    if (value && index < 4) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleUtrKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !utrDigits[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    const utr = utrDigits.join('');
    if (utr.length !== 5) {
      setFormError('Please enter all 5 digits of the UTR');
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.post('/upi/salesman/payments', {
        utr,
        amount: Number(amount),
        paymentMode: 'upi',
        salesmanId: salesman._id
      });
      setFormSuccess('Payment submitted successfully!');
      toast.success('Draft added');
      setUtrDigits(['', '', '', '', '']);
      setAmount('');
      fetchData(); // Refresh history
      
      // Auto clear success message
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit payment.');
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraft = (id) => {
    showConfirm('Delete Draft', 'Are you sure you want to delete this drafted payment?', async () => {
      setDeletingId(id);
      try {
        await apiClient.delete(`/upi/salesman/payments/${id}`, {
          params: { salesmanId: salesman._id }
        });
        toast.success('Draft deleted');
        fetchData();
      } catch (err) {
        showAlert('Delete Failed', err.response?.data?.message || 'Failed to delete payment');
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleBulkSubmit = () => {
    if (pendingPayments.length === 0) return;
    showConfirm('Submit Payments', 'Are you sure you want to finalize and submit all drafted payments to the Owner?', async () => {
      setBulkSubmitting(true);
      try {
        await apiClient.post('/upi/salesman/payments/submit-all', { salesmanId: salesman._id });
        fetchData();
        setActiveTab('previous');
        setFormSuccess('Successfully submitted all payments to the Owner!');
        toast.success('Payments finalized and sent to owner!');
        setTimeout(() => setFormSuccess(''), 4000);
      } catch (err) {
        showAlert('Submission Failed', err.response?.data?.message || 'Failed to submit payments');
      } finally {
        setBulkSubmitting(false);
      }
    });
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
      verified: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Verified' },
      mistake: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertTriangle, label: 'Mistake' },
      missing: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle, label: 'Missing' },
      unreconciled: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle, label: 'Mismatch' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-l-2 border-teal-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
          <div className="absolute inset-4 rounded-full border-b-2 border-green-500 animate-spin"></div>
        </div>
        <div className="text-emerald-600 font-medium tracking-widest text-sm uppercase animate-pulse">Initializing Portal...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#f4f7fb] font-sans rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10 relative">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center mr-3">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">UPI Submission</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{salesman?.name}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Submit Payment Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800">Draft New Entry</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter transaction details provided by shopkeeper.</p>
          </div>
          
          <div className="p-5">
            {formError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{formError}</div>}
            {formSuccess && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm border border-emerald-100">{formSuccess}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 tracking-tight">Last 5 Digits of UTR</label>
                <div className="flex space-x-3 justify-between max-w-[240px]">
                  {utrDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={inputRefs[index]}
                      type="text"
                      required
                      value={digit}
                      onChange={(e) => handleUtrChange(index, e.target.value)}
                      onKeyDown={(e) => handleUtrKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl rounded-xl border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-slate-50 text-slate-900 font-black border outline-none transition-all focus:scale-105"
                      placeholder="-"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 tracking-tight">Amount Received</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-emerald-600 font-bold" />
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 rounded-xl border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-slate-50 text-slate-900 font-bold border p-3.5 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Drafting...
                  </>
                ) : 'Draft Payment'}
              </button>
            </form>
          </div>
        </div>

        {/* Payment History Lists */}
        <div>
          
          {/* Summary Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-4 px-5 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <span className="text-xs text-slate-500 font-bold tracking-widest uppercase mr-2">Drafted Total:</span>
              <span className="text-2xl font-black text-slate-800">₹{pendingTotal.toLocaleString('en-IN')}</span>
              {isOwnerTallying && (
                <p className="text-xs text-rose-500 font-bold mt-1 bg-rose-50 inline-block px-2 py-1 rounded-md">Owner is verifying previous batch...</p>
              )}
            </div>
            <button 
              onClick={handleBulkSubmit}
              disabled={pendingPayments.length === 0 || bulkSubmitting || isOwnerTallying}
              className={`w-full sm:w-auto flex items-center justify-center px-6 py-3 rounded-xl text-sm font-black tracking-wide text-white shadow-sm transition-colors ${pendingPayments.length > 0 && !bulkSubmitting && !isOwnerTallying ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              {bulkSubmitting ? (
                <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {bulkSubmitting ? 'Submitting...' : 'Submit Today'}
            </button>
          </div>

          {/* Custom Animated Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-200/80 p-1.5 rounded-xl flex relative w-full max-w-xs shadow-inner">
              <div 
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-in-out ${activeTab === 'previous' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}
              />
              <button 
                onClick={() => setActiveTab('previous')}
                className={`flex-1 relative z-10 py-2.5 text-xs uppercase tracking-widest font-black rounded-lg transition-colors ${activeTab === 'previous' ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Previous
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 relative z-10 py-2.5 text-xs uppercase tracking-widest font-black rounded-lg transition-colors ${activeTab === 'pending' ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pending
              </button>
            </div>
          </div>

          {/* Lists Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center justify-between">
                {activeTab === 'pending' ? 'Pending Submissions' : (isOwnerTallying ? 'Currently Verifying' : 'Last Finalized Batch')}
                {activeTab === 'previous' && isOwnerTallying && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider font-black px-2 py-1 rounded-md animate-[pulse_2s_ease-in-out_infinite]">Owner Tallying</span>
                )}
              </h2>
            </div>
            
            <div className="overflow-x-auto min-h-[300px]">
              {activeTab === 'pending' ? (
                /* PENDING TABLE */
                <table className="w-full text-left border-collapse animate-in fade-in duration-300">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="p-4">UTR</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingPayments.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-slate-500 text-sm font-medium">
                          No drafted payments waiting.
                        </td>
                      </tr>
                    ) : (
                      pendingPayments.map(payment => (
                        <tr key={payment._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 text-sm font-mono">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md tracking-widest font-bold">
                              {payment.utr}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-800 font-bold text-right">
                            ₹{payment.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => handleDeleteDraft(payment._id)}
                              disabled={deletingId === payment._id}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                /* PREVIOUS TABLE */
                <table className="w-full text-left border-collapse animate-in fade-in duration-300">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="p-4">UTR</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previousPayments.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-slate-500 text-sm font-medium">
                          No previous submissions found in the active 4-day window.
                        </td>
                      </tr>
                    ) : (
                      previousPayments.map(payment => (
                        <tr key={payment._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 text-sm font-mono">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md tracking-widest font-bold">
                              {payment.utr}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-800 font-bold text-right">
                            ₹{payment.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 text-center">
                            <StatusBadge status={payment.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Custom Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center tracking-tight">
              {modalConfig.type === 'confirm' ? null : <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />}
              {modalConfig.title}
            </h3>
            <p className="text-slate-500 mb-6 text-sm font-medium">{modalConfig.message}</p>
            <div className="flex justify-end space-x-3">
              {modalConfig.type === 'confirm' && (
                <button onClick={closeModal} className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm">
                  Cancel
                </button>
              )}
              <button 
                onClick={() => {
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                  closeModal();
                }}
                className={`px-5 py-2.5 rounded-xl text-white font-bold transition-colors shadow-sm text-sm tracking-wide ${modalConfig.type === 'confirm' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-black'}`}
              >
                {modalConfig.type === 'confirm' ? 'Confirm' : 'Okay'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
