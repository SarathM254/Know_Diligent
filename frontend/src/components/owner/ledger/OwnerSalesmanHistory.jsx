import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SalesmanStatementHistory from '../../salesman/SalesmanStatementHistory';

export default function OwnerSalesmanHistory() {
  const { salesmanId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80 shadow-sm relative pb-12">
      
      {/* Sticky Dashboard Section Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center gap-x-4 z-10">
        <button type="button" onClick={() => navigate('/owner/ledger')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Ledger History</h2>
          <p className="text-[11px] text-slate-400">Viewing recent transactions for field agent</p>
        </div>
      </div>

      <div className="p-4">
        <SalesmanStatementHistory salesmanId={salesmanId} />
      </div>

    </div>
  );
}
