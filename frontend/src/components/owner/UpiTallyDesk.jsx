import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Activity, Trash2, Edit2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpiTallyDesk() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSalesmanId, setExpandedSalesmanId] = useState(null);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'previous'
  const [archiving, setArchiving] = useState(false);

  // Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Old List Search State
  const [utrSearchQuery, setUtrSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Manual Add State
  const [showManual, setShowManual] = useState(false);
  const [manualUtr, setManualUtr] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [addingManual, setAddingManual] = useState(false);

  // Inline Edit State
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editForm, setEditForm] = useState({ utr: '', amount: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, paymentsRes] = await Promise.all([
        apiClient.get('/upi/owner/dashboard/stats'),
        apiClient.get('/upi/owner/payments')
      ]);
      setStats(statsRes.data.data);
      setPayments(paymentsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch owner data', err);
      toast.error('Failed to load UPI tally data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError('');
      setUploadResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('statement', file);

    try {
      const res = await apiClient.post('/upi/owner/reconciliation/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data.data);
      setFile(null);
      toast.success('Statement processed and reconciled!');
      // Refresh global stats and payments after reconciliation
      fetchDashboardData();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to process statement PDF.');
      toast.error('Failed to parse statement');
    } finally {
      setUploading(false);
    }
  };

  const handleArchiveAll = async () => {
    if (!window.confirm('Are you sure you want to tally out for the day? This will clear the current screen.')) return;
    setArchiving(true);
    try {
      await apiClient.post('/upi/owner/payments/archive');
      toast.success('Archived cycle successfully');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive payments');
    } finally {
      setArchiving(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
      verified: { color: 'bg-emerald-100 text-emerald-700', label: 'Verified' },
      mistake: { color: 'bg-rose-100 text-rose-700', label: 'Mistake' },
      missing: { color: 'bg-red-100 text-red-800', label: 'Missing' },
      unreconciled: { color: 'bg-red-100 text-red-700', label: 'Mismatch' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <div className="absolute inset-4 rounded-full border-b-2 border-pink-500 animate-spin"></div>
        </div>
        <div className="text-indigo-500 font-medium tracking-widest text-sm uppercase animate-pulse">Loading Workspace...</div>
      </div>
    );
  }

  const handleSearchOldList = async (e) => {
    e.preventDefault();
    if (utrSearchQuery.length !== 5) {
      toast.error('Please enter exactly 5 digits');
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.get(`/upi/owner/verified-utrs/search?utr=${utrSearchQuery}`);
      setSearchResults(res.data.data);
      if (res.data.count === 0) {
        toast.error('No matching verified UTR found');
      } else {
        toast.success(`Found ${res.data.count} matches`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (manualUtr.length !== 5 || !manualAmount || !manualDate) {
      toast.error('Please fill all fields correctly');
      return;
    }
    setAddingManual(true);
    try {
      await apiClient.post('/upi/owner/verified-utrs/manual', {
        utrSnippet: manualUtr,
        amount: manualAmount,
        statementDate: manualDate
      });
      toast.success('Manual record added successfully');
      setManualUtr('');
      setManualAmount('');
      setManualDate('');
      setShowManual(false);
      // Auto-search for the newly added UTR to show it in results
      setUtrSearchQuery(manualUtr);
      
      const res = await apiClient.get(`/upi/owner/verified-utrs/search?utr=${manualUtr}`);
      setSearchResults(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add record');
    } finally {
      setAddingManual(false);
    }
  };

  const handleDeleteErrorPayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      await apiClient.delete(`/upi/owner/payments/${paymentId}`);
      toast.success('Payment deleted successfully');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete payment');
    }
  };

  const startEditing = (payment) => {
    setEditingPaymentId(payment._id);
    setEditForm({ 
      utr: payment.utr || '', 
      amount: payment.amount || '' 
    });
  };

  const handleSaveEdit = async (paymentId) => {
    if (editForm.utr && editForm.utr.length !== 5) {
      toast.error('UTR must be 5 digits');
      return;
    }
    setSavingEdit(true);
    try {
      await apiClient.put(`/upi/owner/payments/${paymentId}`, {
        utr: editForm.utr,
        amount: editForm.amount
      });
      toast.success('Payment updated successfully');
      setEditingPaymentId(null);
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start mx-auto border-x border-slate-200/80 shadow-sm pb-8 font-sans">
      
      {/* HEADER SECTION */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-5 py-4 z-10 shadow-2xs flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate('/owner')} className="mr-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div>
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Verification Desk</span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">UPI Tally Hub</h1>
          </div>
        </div>
        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-8">
        
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Active</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.totalPayments || 0}</h3>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Verified</p>
              <h3 className="text-2xl font-black text-emerald-600">{stats.verifiedPayments || 0}</h3>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Pending</p>
              <h3 className="text-2xl font-black text-amber-500">{stats.pendingPayments || 0}</h3>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Mistakes</p>
              <h3 className="text-2xl font-black text-rose-500">{(stats.errorPayments || 0) + (stats.mistakePayments || 0)}</h3>
            </div>
            <div className="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-indigo-100 flex flex-col justify-center bg-indigo-50/50">
              <p className="text-[10px] font-bold text-indigo-500 mb-1 uppercase tracking-wider">Active Amount</p>
              <h3 className="text-2xl font-black text-indigo-700">₹{stats.totalAmount?.toLocaleString('en-IN') || 0}</h3>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Statement Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Reconciliation</h2>
                <p className="text-xs text-slate-500 mt-0.5">Upload SBI PDF statement to auto-tally payments.</p>
              </div>
              
              <div className="p-5">
                <form onSubmit={handleUpload}>
                  <div className="flex justify-center px-6 py-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors bg-slate-50">
                    <div className="space-y-2 text-center">
                      <UploadCloud className="mx-auto h-10 w-10 text-indigo-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-indigo-600 hover:text-indigo-500">
                          <span>Upload a file</span>
                          <input type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                        </label>
                      </div>
                      <p className="text-xs font-semibold text-slate-400">PDF up to 10MB</p>
                    </div>
                  </div>
                  
                  {file && (
                    <div className="mt-4 flex items-center text-sm font-semibold text-slate-700 bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <FileText className="w-5 h-5 mr-2 text-indigo-500 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">
                      {uploadError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!file || uploading}
                    className={`mt-4 w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-sm text-sm font-bold tracking-wide text-white transition-colors ${(!file || uploading) ? 'bg-indigo-400 opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}`}
                  >
                    {uploading ? 'Processing Statement...' : 'Start Tally Process'}
                  </button>
                </form>

                {/* Results Card */}
                {uploadResult && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <h3 className="text-sm font-black text-emerald-900 mb-3 flex items-center tracking-tight">
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Reconciliation Complete
                    </h3>
                    <ul className="space-y-2 text-xs font-semibold text-emerald-800">
                      <li className="flex justify-between border-b border-emerald-100/50 pb-1"><span>Transactions Found:</span> <strong>{uploadResult.transactionsParsed}</strong></li>
                      <li className="flex justify-between border-b border-emerald-100/50 pb-1"><span>Payments Tallied:</span> <strong className="text-emerald-600">{uploadResult.talliedCount}</strong></li>
                      <li className="flex justify-between"><span>Unreconciled Mismatches:</span> <strong className="text-red-600">{uploadResult.unreconciledCount}</strong></li>
                    </ul>
                  </div>
                )}
                
                {/* Done for the Day Button */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 mb-1 tracking-tight">Finalize Cycle</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mb-4 uppercase tracking-wider leading-relaxed">Archive current screen to allow salesmen to submit their next batch.</p>
                  <button
                    onClick={handleArchiveAll}
                    disabled={archiving || !stats || stats.pendingPayments > 0 || stats.totalPayments === 0}
                    className={`w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-sm text-sm font-bold tracking-wide text-white transition-colors ${archiving || !stats || stats.pendingPayments > 0 || stats.totalPayments === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-black active:scale-[0.98]'}`}
                  >
                    {archiving ? 'Archiving...' : 'Done for the Day'}
                  </button>
                  {stats && stats.pendingPayments > 0 && stats.totalPayments > 0 && (
                    <p className="text-[10px] font-bold tracking-wider uppercase text-amber-600 mt-3 text-center bg-amber-50 py-2 rounded-lg">Cannot finalize with {stats.pendingPayments} pending</p>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* All Payments List - Accordion View */}
          <div className="lg:col-span-2">
            
            {/* Custom Animated Toggle */}
            <div className="flex justify-center mb-6">
              <div className="bg-slate-200/80 p-1.5 rounded-xl flex relative w-full max-w-sm shadow-inner">
                <div 
                  className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${
                    activeTab === 'old' ? 'translate-x-0' : 
                    activeTab === 'previous' ? 'translate-x-full' : 
                    'translate-x-[200%]'
                  }`}
                />
                <button 
                  onClick={() => setActiveTab('old')}
                  className={`flex-1 relative z-10 py-2.5 text-xs font-black tracking-widest uppercase rounded-lg transition-colors ${activeTab === 'old' ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Old List
                </button>
                <button 
                  onClick={() => setActiveTab('previous')}
                  className={`flex-1 relative z-10 py-2.5 text-xs font-black tracking-widest uppercase rounded-lg transition-colors ${activeTab === 'previous' ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setActiveTab('current')}
                  className={`flex-1 relative z-10 py-2.5 text-xs font-black tracking-widest uppercase rounded-lg transition-colors ${activeTab === 'current' ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Current
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                  {activeTab === 'current' ? 'Current Cycle Payments' : 
                   activeTab === 'previous' ? 'Archived Payments' : 
                   'Verified Failsafe (8 Days)'}
                </h2>
              </div>
              
              <div className="p-4 space-y-4">
                {activeTab === 'old' ? (
                  <div className="max-w-md mx-auto py-8">
                    <form onSubmit={handleSearchOldList} className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 tracking-tight text-center">Last 5 Digits of UTR</label>
                        <div className="flex justify-center">
                          <input 
                            type="text" 
                            maxLength={5}
                            value={utrSearchQuery}
                            onChange={(e) => setUtrSearchQuery(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 12345"
                            className="w-48 text-center text-xl tracking-widest font-mono font-bold text-slate-900 bg-slate-50/80 border-2 border-slate-200 rounded-xl py-3 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all duration-150"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={searching || utrSearchQuery.length !== 5}
                        className={`w-full py-3.5 rounded-xl font-bold tracking-wide text-white transition-colors ${searching || utrSearchQuery.length !== 5 ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}`}
                      >
                        {searching ? 'Searching...' : 'Search'}
                      </button>
                    </form>

                    <div className="mt-4 text-center">
                      <button 
                        onClick={() => setShowManual(!showManual)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {showManual ? '- Cancel Manual Entry' : '+ Add Manual Record'}
                      </button>
                    </div>

                    {showManual && (
                      <form onSubmit={handleAddManual} className="mt-6 bg-slate-100 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Manual Bank Extract</h3>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Date String (e.g., 15 Jun 2026)</label>
                          <input 
                            type="text" 
                            required
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">5-Digit UTR</label>
                            <input 
                              type="text" 
                              maxLength={5}
                              required
                              value={manualUtr}
                              onChange={(e) => setManualUtr(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹)</label>
                            <input 
                              type="number" 
                              required
                              value={manualAmount}
                              onChange={(e) => setManualAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <button 
                          type="submit"
                          disabled={addingManual || manualUtr.length !== 5 || !manualAmount || !manualDate}
                          className={`w-full py-2.5 rounded-lg font-bold text-xs tracking-wide text-white transition-colors mt-2 ${addingManual || manualUtr.length !== 5 || !manualAmount || !manualDate ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                          {addingManual ? 'Saving...' : 'Save Manual Record'}
                        </button>
                      </form>
                    )}

                    {searchResults.length > 0 && (
                      <div className="mt-8 space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Match Results</h3>
                        {searchResults.map((res, i) => (
                          <div key={res._id || i} className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Bank Extract</p>
                              <p className="text-sm font-medium text-slate-700">{res.statementDate}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-400">UTR: <span className="font-mono text-slate-600">{res.utrSnippet}</span></p>
                              <p className="text-lg font-black text-emerald-700 mt-0.5">₹{res.amount.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : payments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium text-sm">
                    No payments found.
                  </div>
                ) : (
                  Object.values(
                    payments
                      .filter(p => activeTab === 'current' ? !p.isArchivedByOwner : p.isArchivedByOwner)
                      .reduce((acc, payment) => {
                        const sId = payment.salesman?._id || 'unknown';
                        if (!acc[sId]) {
                          acc[sId] = {
                            salesman: payment.salesman || { name: 'Unknown', _id: 'unknown' },
                            payments: [],
                            totalAmount: 0,
                            totalCount: 0
                          };
                        }
                        acc[sId].payments.push(payment);
                        acc[sId].totalAmount += payment.amount;
                        acc[sId].totalCount += 1;
                        return acc;
                      }, {})
                  ).map((group) => {
                    const hasError = group.payments.some(p => ['mistake', 'missing', 'unreconciled'].includes(p.status));
                    const hasPending = group.payments.some(p => p.status === 'pending');
                    
                    let borderClass = 'border-slate-200';
                    let iconBg = 'bg-slate-100 text-slate-700';
                    let statusText = '';

                    if (hasError) {
                      borderClass = 'border-rose-400 z-10 relative';
                      iconBg = 'bg-rose-100 text-rose-700';
                      statusText = 'Errors Found';
                    } else if (hasPending) {
                      borderClass = 'border-amber-400';
                      iconBg = 'bg-amber-100 text-amber-700';
                      statusText = 'Pending Tally';
                    } else {
                      borderClass = 'border-emerald-400';
                      iconBg = 'bg-emerald-100 text-emerald-700';
                      statusText = 'Perfectly Tallied';
                    }

                    return (
                    <div key={group.salesman._id} className={`rounded-xl overflow-hidden bg-white border-[2px] ${borderClass}`}>
                      <button
                        onClick={() => setExpandedSalesmanId(expandedSalesmanId === group.salesman._id ? null : group.salesman._id)}
                        className="w-full bg-slate-50 hover:bg-slate-100 transition-colors px-4 sm:px-5 py-4 flex justify-between items-center outline-none"
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${iconBg}`}>
                            {group.salesman.name.substring(0,2).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <h3 className="text-sm font-black text-slate-800 tracking-tight flex flex-wrap items-center gap-2">
                              {group.salesman.name}
                              <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md ${iconBg}`}>
                                {statusText}
                              </span>
                            </h3>
                            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{group.totalCount} Payments</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Total Collected</p>
                            <p className="text-sm font-black text-slate-800">₹{group.totalAmount.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200 shrink-0">
                            {expandedSalesmanId === group.salesman._id ? (
                              <ChevronUp className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                        </div>
                      </button>

                      {expandedSalesmanId === group.salesman._id && (
                        <div className="border-t border-slate-200 bg-white p-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                  <th className="p-3">UTR</th>
                                  <th className="p-3 text-right">Amount</th>
                                  <th className="p-3 text-center">Status</th>
                                  <th className="p-3 text-right"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {group.payments.map((payment) => {
                                  const isError = ['mistake', 'missing', 'unreconciled'].includes(payment.status);
                                  const isEditing = editingPaymentId === payment._id;

                                  if (isEditing) {
                                    return (
                                      <tr key={payment._id} className="bg-indigo-50/50">
                                        <td className="p-3">
                                          <input
                                            type="text"
                                            maxLength={5}
                                            value={editForm.utr}
                                            onChange={(e) => setEditForm({ ...editForm, utr: e.target.value.replace(/\D/g, '') })}
                                            placeholder="5-digit UTR"
                                            className="w-24 px-2 py-1 text-sm font-mono font-bold border border-indigo-200 rounded focus:outline-hidden focus:border-indigo-500"
                                          />
                                        </td>
                                        <td className="p-3 text-right">
                                          <input
                                            type="number"
                                            value={editForm.amount}
                                            onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                            placeholder="Amount"
                                            className="w-24 px-2 py-1 text-sm font-bold text-right border border-indigo-200 rounded focus:outline-hidden focus:border-indigo-500"
                                          />
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className="text-[10px] uppercase font-bold text-indigo-500">Editing</span>
                                        </td>
                                        <td className="p-3 text-right space-x-2">
                                          <button 
                                            onClick={() => setEditingPaymentId(null)}
                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                            disabled={savingEdit}
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => handleSaveEdit(payment._id)}
                                            className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-100 rounded"
                                            disabled={savingEdit}
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                  <tr key={payment._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 text-sm text-slate-600 font-mono">
                                      {payment.utr ? (
                                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 font-bold">{payment.utr}</span>
                                      ) : '-'}
                                    </td>
                                    <td className="p-3 text-sm text-slate-800 font-bold text-right">
                                      {payment.status === 'mistake' && payment.actualBankAmount ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <span className="text-rose-600 line-through text-xs opacity-70">₹{payment.amount.toLocaleString('en-IN')}</span>
                                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">₹{payment.actualBankAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                      ) : (
                                        `₹${payment.amount.toLocaleString('en-IN')}`
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      <StatusBadge status={payment.status} />
                                    </td>
                                    <td className="p-3 text-right">
                                      {isError && (
                                        <div className="flex justify-end space-x-2 opacity-60 hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => startEditing(payment)}
                                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Payment"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteErrorPayment(payment._id)}
                                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete Payment"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )})}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )})
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
