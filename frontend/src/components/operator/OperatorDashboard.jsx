import React, { useState, useEffect } from 'react';
import AuditBillChallan from './AuditBillChallan';
import { getPendingBillsForAdmin, updateBillStatusByOwner } from '../../api/billApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function OperatorDashboard({ onBackToList }) {
  const navigate = useNavigate();
  const [openBillId, setOpenBillId] = useState(null);
  const [temporaryCheckedBills, setTemporaryCheckedBills] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Array containing the state-aware 'billStatus' field
  const [pendingBills, setPendingBills] = useState([]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await getPendingBillsForAdmin();
      // Operators only see bills that have been delivered by the owner, or already billed
      const validBills = data.filter(b => b.status === 'delivered' || b.status === 'billed');
      setPendingBills(validBills);
    } catch (error) {
      console.error("Failed to load bills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const toggleAccordion = (id) => {
    setOpenBillId(openBillId === id ? null : id);
  };

  const handleChallanClearanceState = (billId, isFullyChecked) => {
    setTemporaryCheckedBills(prev => ({ ...prev, [billId]: isFullyChecked }));
  };

  /*
    CRITICAL FEATURE REFACTOR: PRODUCTION-GRADE DISPATCH COMMIT LOCK
    Simulates a backend database transaction update. It changes the local document's
    status to "billed", triggering permanent view constraints on borders and inputs.
  */
  const commitDispatchLock = async (billId) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateBillStatusByOwner(billId, { status: 'billed' });
      setPendingBills(prevBills => 
        prevBills.map(bill => 
          bill._id === billId ? { ...bill, status: "billed" } : bill
        )
      );
      toast.success(`Backend status synced successfully to "billed" for token reference: ${billId}`);
    } catch (error) {
      console.error("Failed to commit dispatch:", error);
      toast.error("Failed to commit dispatch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80">
      
      <div className="sticky top-0 bg-[rgb(63,42,199)] border-b border-slate-200/80 px-4 py-4 z-10 w-full flex items-center gap-x-4">
        <button type="button" onClick={onBackToList || (() => navigate(-1))} className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[rgb(255,255,255)] tracking-wider">Operator Desk</h2>
      </div>

      <div className="flex-1 p-4 space-y-3.5 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12 text-slate-400 animate-pulse font-medium">Loading operator manifest...</div>
        ) : pendingBills.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">No delivered bills awaiting dispatch.</div>
        ) : pendingBills.map((bill) => {
          const isOpen = openBillId === bill._id;
          const isAlreadyBilled = bill.status === "billed";
          const isTemporaryChecked = !!temporaryCheckedBills[bill._id];

          // Determine structural border accents based on permanent DB status or live click evaluations
          const isLockedOrComplete = isAlreadyBilled || isTemporaryChecked;

          return (
            <div 
              key={bill._id}
              className={`bg-white rounded-xl overflow-hidden transition-all duration-200 border shadow-2xs ${
                isAlreadyBilled
                  ? 'border-emerald-600 bg-emerald-50/5 ring-1 ring-emerald-600/30 font-medium'
                  : isTemporaryChecked 
                    ? 'border-emerald-400 ring-1 ring-emerald-400/20 shadow-sm' 
                    : isOpen ? 'border-slate-300 shadow-sm' : 'border-slate-200/70'
              }`}
            >
              {/* Accordion Trigger Header */}
              <button
                type="button"
                onClick={() => toggleAccordion(bill._id)}
                className={`w-full px-8 py-4 flex items-center justify-between text-left transition-colors duration-150 ${
                  isAlreadyBilled ? 'bg-emerald-50/10' : isTemporaryChecked ? 'bg-emerald-50/5' : 'bg-white hover:bg-slate-50/40'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-x-2">
                    {bill.salesmanName}
                    
                    {/* Status Badges */}
                    {isAlreadyBilled ? (
                      <span className="bg-emerald-700 text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded shadow-2xs">
                        ✓ DISPATCHED & BILLED
                      </span>
                    ) : isTemporaryChecked ? (
                      <span className="bg-amber-500 text-white text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-sm">
                        AUDITED
                      </span>
                    ) : null}
                  </span>
                </div>

                <svg 
                  className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                  fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Dynamic Drawer Injection */}
              {isOpen && (
                <AuditBillChallan 
                  items={bill.items}
                  isAlreadyBilled={isAlreadyBilled}
                  onChallanCleared={(allChecked) => handleChallanClearanceState(bill._id, allChecked)}
                />
              )}

              {/* Bottom Sticky Action Lock */}
              {isOpen && isLockedOrComplete && (
                <div className={`p-3 flex justify-end border-t ${isAlreadyBilled ? 'bg-emerald-50/10 border-emerald-100/50' : 'bg-emerald-50/40 border-emerald-100'}`}>
                  {isAlreadyBilled ? (
                    <span className="text-xs font-bold text-emerald-700 italic flex items-center gap-1">
                      Manifest safely submitted to Owner queue ledger.
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => commitDispatchLock(bill._id)}
                      className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs py-2 px-3.5 rounded-lg tracking-wide shadow-xs transition-all duration-150 flex items-center gap-x-1"
                    >
                      {isSubmitting ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <>
                          <span>Confirm</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002-2.25v-6.75a2.25 2.25 0 00-2-2.25H6.75a2.25 2.25 0 00-2 2.25v6.75a2.25 2.25 0 002 2.25z" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}