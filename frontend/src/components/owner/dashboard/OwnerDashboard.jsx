import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardStats, pushGlobalSystemDate } from '../../../api/billApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  // --- SECTION 1: GLOBAL SYSTEM STATE ---
  // In production, realWorldDate matches the actual system clock (new Date())
  const realWorldDate = useMemo(() => new Date(), []);
  
  // This is your global Business System Date synced from your MongoDB SystemConfig collection
  const [systemOperationalDate, setSystemOperationalDate] = useState(new Date());
  
  const [financials, setFinancials] = useState({
    totalSalesmanBFDebt: 0,
    stockDelivered: { billed: 0, unbilled: 0 }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      if (res.operationalDate) {
        const [y, m, d] = res.operationalDate.split('-');
        setSystemOperationalDate(new Date(y, m - 1, d));
      }
      setFinancials({
        totalSalesmanBFDebt: res.totalSalesmanBFDebt || 0,
        stockDelivered: {
          billed: res.stockDelivered?.billed || 0,
          unbilled: res.stockDelivered?.unbilled || 0
        }
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);


  // --- SECTION 2: DETERMINISTIC BUTTON LOCK ARITHMETIC ---
  /*
    CRITICAL FEATURE IMPLEMENTATION: DETERMINISTIC SYSTEM LOCK-DOWN MATRIX
    Evaluates if an advance has occurred by comparing the app's business date 
    against the true calendar day. If the business day is ahead, the button 
    disables completely until the real world catches up naturally.
  */
  const isAlreadyAdvanced = useMemo(() => {
    const realMidnight = new Date(realWorldDate.getFullYear(), realWorldDate.getMonth(), realWorldDate.getDate());
    const systemMidnight = new Date(systemOperationalDate.getFullYear(), systemOperationalDate.getMonth(), systemOperationalDate.getDate());
    
    return systemMidnight > realMidnight;
  }, [realWorldDate, systemOperationalDate]);

  const totalStockVolumeM = useMemo(() => {
    return financials.stockDelivered.billed + financials.stockDelivered.unbilled;
  }, [financials]);

  const formattedSystemDate = useMemo(() => {
    return systemOperationalDate.toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short'
    });
  }, [systemOperationalDate]);

  // --- SECTION 3: RE-ENGINEERED DATE ADVANCE HOOK ---
  const handleSystemDatePushForward = async () => {
    if (isAlreadyAdvanced || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await pushGlobalSystemDate();
      if (res.data && res.data.operationalDate) {
        const [y, m, d] = res.data.operationalDate.split('-');
        setSystemOperationalDate(new Date(y, m - 1, d));
        // Refresh stats on new date
        fetchStats();
      } else {
        // Fallback local update if response is structurally different
        const nextDate = new Date(systemOperationalDate);
        nextDate.setDate(nextDate.getDate() + 1);
        setSystemOperationalDate(nextDate);
      }
      toast.success("System date advanced successfully");
    } catch (err) {
      console.error("Failed to push global date", err);
      toast.error("Failed to advance system date");
    } finally {
      setIsSubmitting(false);
    }
  };

  const portalWindows = [
    { id: "upi", title: "UPI Tally Desk", desc: "Reconcile daily UPI payments from salesmen using SBI PDFs", countBadge: "Bank", badgeColor: "bg-emerald-500 text-white", svg: <svg className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: "verify", title: "Verification Desk", desc: "Approve operator-slashed bills & cashout sheets", countBadge: "", badgeColor: "bg-red-500 text-white", svg: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: "inventory", title: "Inventory Control", desc: "Monitor warehouse stock levels & factory shipments", countBadge: "Live", badgeColor: "bg-slate-100 text-slate-600 border-slate-200", svg: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg> },
    { id: "ledger", title: "Ledger Accounts", desc: "Audit long-term statement histories & sales performance", countBadge: "Secure", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", svg: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
    { id: "brands", title: "Brand Manager", desc: "Configure product lists & map wholesale price tiers", countBadge: "25 SKUs", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", svg: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg> },
    { id: "staff", title: "Manage Staff", desc: "Provision warehouse operators & onboard field agents", countBadge: "Active", badgeColor: "bg-slate-100 text-slate-600 border-slate-200", svg: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-2.533-3.076c-2.208-.8-4.59-.224-6.34 1.154M15 19.128v-.008c0-1.25-.487-2.484-1.395-3.393M15 19.128v.003c0 .83-.166 1.643-.489 2.39a1.747 1.747 0 01-1.062 1.011 5.108 5.108 0 01-3.4 0 1.747 1.747 0 01-1.062-1.011 6.304 6.304 0 01-.49-2.39v-.003m0-4c.18-.009.363-.012.546-.012 1.17 0 2.291.28 3.294.773m-3.84 12.42A9.21 9.21 0 014.5 19.5M4.5 19.5a9.34 9.34 0 01-1.624-5.57c0-2.062.667-4.053 1.812-5.704a4.125 4.125 0 015.713-1.673 8.95 8.95 0 014.22 3.084M4.5 19.5v.008c0 .326.022.651.066.974m0 0c.13.957.51 1.862 1.11 2.622M13.5 7.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: "billing_ops", title: "Billing Operations", desc: "Access the operator desk to dispatch delivered bills", countBadge: "Desk", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", svg: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> },
    { id: "calculator", title: "Bill Calculator", desc: "Instantly evaluate bill totals using wholesale or retail price tiers", countBadge: "Tool", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", svg: <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.25-6.75h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5v-.008zm2.25-6.75h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75v-.008zm2.25-6.75h.008v.008H15v-.008zm0 2.25h.008v.008H15v-.008zm0 2.25h.008v.008H15v-.008zm0 2.25h.008v.008H15v-.008zM12 21h4.5A2.25 2.25 0 0018.75 18.75V5.25A2.25 2.25 0 0016.5 3h-9A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h4.5z" /></svg> }
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80 shadow-sm pb-8">
      
      {/* HEADER SECTION */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-5 py-4 z-10 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Administrative Hub</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">Owner Control Panel</h1>
        </div>
        <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">HQ</div>
      </div>

      <div className="p-4 space-y-4">

        {/* --- SYSTEM CONTEXT CALENDAR PUSH BLOCK --- */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between gap-x-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Business Operational Date
            </span>
            <p className="text-base font-black text-slate-800 tracking-tight">
              {formattedSystemDate}
            </p>
          </div>
          
          <button
            type="button"
            disabled={isAlreadyAdvanced || isSubmitting}
            onClick={handleSystemDatePushForward}
            className={`font-bold text-xs py-2.5 px-3.5 rounded-xl tracking-wide transition-all duration-150 shadow-xs flex items-center gap-x-1.5 ${
              isAlreadyAdvanced 
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none' 
                : 'bg-slate-900 hover:bg-slate-800 active:bg-black text-white disabled:opacity-50'
            }`}
          >
            {isAlreadyAdvanced ? (
              <>
                <span>Advanced</span>
                <svg className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </>
            ) : isSubmitting ? (
              <>
                <span>Advancing...</span>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </>
            ) : (
              <>
                <span>Advance Date</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* --- EXECUTIVE KPI SUMMARY GRIDS --- */}
        <div className="space-y-3">
          {/* Debt Overage Metric */}


          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Salesman Exposure</span>
              <p className="text-xs text-slate-400">Aggregated Market Brought Forward (BF) Debt</p>
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tight bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              ₹{financials.totalSalesmanBFDebt.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Load Volume Subtotals Block */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stock Dispatched</span>
                <p className="text-xs text-slate-400">Sum volume of all agency active runs</p>
              </div>
              <div className="flex items-baseline font-black text-slate-900 text-xl tracking-tight">
                <span>{totalStockVolumeM.toFixed(2)}</span>
                <span className="text-xs font-bold text-slate-400 uppercase ml-0.5">M</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
              <div className="space-y-0.5 pr-2 text-left">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Billed Load
                </span>
                <p className="text-base font-extrabold text-slate-800 tracking-tight">
                  {financials.stockDelivered.billed.toFixed(2)} <span className="text-xs font-medium text-slate-400">M</span>
                </p>
              </div>
              <div className="space-y-0.5 pl-4 text-left">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex justify-end items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unbilled Load
                </span>
                <p className="text-base font-extrabold text-slate-800 tracking-tight">
                  {financials.stockDelivered.unbilled.toFixed(2)} <span className="text-xs font-medium text-slate-400">M</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- MODULE PORTAL LINKS --- */}
        <div className="space-y-2.5">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Functional Control Modules</h3>
          <div className="space-y-2">
            {portalWindows.map((portal) => (
              <div
                key={portal.id}
                onClick={() => {
                    navigate('/owner/' + portal.id);
                }}
                className="group w-full bg-white border border-slate-200/70 hover:border-indigo-500 rounded-xl p-4 flex items-center justify-between gap-x-4 cursor-pointer shadow-3xs transition-all duration-150 hover:shadow-2xs active:bg-slate-50/50"
              >
                <div className="flex items-start gap-x-3.5">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                    {portal.svg}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-x-2">
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{portal.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal max-w-60">{portal.desc}</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-0.5 transition-all duration-150 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}