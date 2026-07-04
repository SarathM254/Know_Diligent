import React, { useState, useEffect } from 'react';
import { getSalesmen, adjustLedgerBalance } from '../../../api/userApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function LedgerControlPortal() {
  const navigate = useNavigate();
  // --- STATE FOR MANAGING THE ACTIVE ADJUSTMENT MODAL OVERLAY ---
  const [modalContext, setModalContext] = useState(null); // null, or { type: 'increase' | 'decrease', salesman: Object }
  const [inputAmount, setInputAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Salesmen master records array
  const [salesmenList, setSalesmenList] = useState([]);

  const loadSalesmen = async () => {
    try {
      setLoading(true);
      const data = await getSalesmen();
      setSalesmenList(data);
    } catch (error) {
      console.error("Failed to load salesmen:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesmen();
  }, []);

  const openAdjustmentModal = (type, salesman) => {
    setModalContext({ type, salesman });
    setInputAmount('');
    setAdjustmentNote('');
  };

  const closeAdjustmentModal = () => {
    setModalContext(null);
  };

  /*
    CRITICAL FEATURE IMPLEMENTATION: INT-ONLY KEYBOARD EVENT FILTER
    Blocks decimal points, minus signs, and exponential notation layout triggers.
    Forces manual ledger mutations to be entered as absolute whole integers.
  */
  const handleStrictIntegerKeyDown = (e) => {
    if (['.', '-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleCommitLedgerAdjustment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const targetAmount = parseInt(inputAmount, 10);
    if (isNaN(targetAmount) || targetAmount <= 0) return;

    const changeFactor = modalContext.type === 'increase' ? targetAmount : -targetAmount;

    setIsSubmitting(true);
    try {
      await adjustLedgerBalance({
        userId: modalContext.salesman._id,
        amount: changeFactor,
        actionDescription: adjustmentNote
      });
      loadSalesmen(); // Refresh actual data from server securely
      closeAdjustmentModal();
      toast.success("Ledger adjusted successfully.");
    } catch (error) {
      console.error("Failed to adjust ledger:", error);
      toast.error("Failed to adjust ledger balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80 shadow-sm relative pb-12">
      
      {/* Sticky Dashboard Section Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center gap-x-4 z-10">
        <button type="button" onClick={() => navigate('/owner')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Ledger Balance Adjustments</h2>
          <p className="text-[11px] text-slate-400">Directly modify active salesman outstanding brought forward values</p>
        </div>
      </div>

      {/* Main Stream Core Feed */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 animate-pulse text-sm">
            Loading Ledger Balances...
          </div>
        ) : salesmenList.map((salesman) => (
          <div 
            key={salesman._id} 
            className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-3xs space-y-4 transition-all hover:border-slate-300"
          >
            {/* Upper Descriptor Block */}
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold text-slate-800 tracking-tight mt-0.5">
                {salesman.name}
              </h3>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current BF</span>
                <span className="text-base font-black text-slate-900 tracking-tight">
                  ₹{Math.floor(salesman.broughtForwardDebt || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Split Interface Action Buttons Layout */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-50">
              {/* Increase Trigger */}
              <button
                type="button"
                onClick={() => openAdjustmentModal('increase', salesman)}
                className="w-full bg-rose-50/60 hover:bg-rose-50 border border-rose-100 rounded-xl py-2.5 font-bold text-sm text-rose-700 transition-colors flex items-center justify-center gap-x-1"
              >
                <span className="text-lg leading-none font-medium">+</span>
                <span>Increase</span>
              </button>

              {/* Decrease Trigger */}
              <button
                type="button"
                onClick={() => openAdjustmentModal('decrease', salesman)}
                className="w-full bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 rounded-xl py-2.5 font-bold text-sm text-emerald-700 transition-colors flex items-center justify-center gap-x-1"
              >
                <span className="text-lg leading-none font-medium">-</span>
                <span>Decrease</span>
              </button>
            </div>

            {/* View History Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(`/owner/ledger/history/${salesman._id}`)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 font-bold text-xs text-slate-600 transition-colors flex items-center justify-center gap-x-1.5 shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <span>View Ledger History</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- SECTION 4: CONTEXTUAL AUDIT POPUP MODAL DIALOG OVERLAY --- */}
      {modalContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200">
          
          {/* Modal Container Body Grid Box */}
          <div 
            className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Popup Context Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  Manual Ledger Modification
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Target Account Context: <span className="font-semibold text-slate-700">{modalContext.salesman.name}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={closeAdjustmentModal}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-medium p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Popup Form Controls Workspace */}
            <form onSubmit={handleCommitLedgerAdjustment} className="p-5 space-y-4">
              
              {/* Field Block 1: Incremental Cash Adjustment Count */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {modalContext.type === 'increase' ? 'Amount to Increment (₹)' : 'Amount to Decrement (₹)'}
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-slate-400 select-none pointer-events-none">₹</span>
                  <input
                    type="number"
                    required
                    inputMode="numeric"
                    min="1"
                    placeholder="0"
                    value={inputAmount}
                    onKeyDown={handleStrictIntegerKeyDown}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Field Block 2: Informative Narrative Audit Audit Trail Memo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Modification Audit Narration / Reason
                </label>
                <textarea
                  required
                  rows="2"
                  placeholder="e.g., Due to vehicle repair costs adjustment..."
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs resize-none"
                />
              </div>

              {/* Action Sheet Execution Button Drawer Stack */}
              <div className="flex items-center gap-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeAdjustmentModal}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 flex items-center justify-center gap-x-2 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 ${
                    modalContext.type === 'increase'
                      ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                  }`}
                >
                  {isSubmitting && (
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span>{isSubmitting ? 'Applying...' : 'Apply Change'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}