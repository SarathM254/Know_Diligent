import React from 'react';

export default function AuditBillView({ items, isSubmitting, onModifyClick, onApproveClick }) {
  return (
    <div className="p-4 bg-slate-50/50 space-y-4">
      
      {/* Clean Borderless List Item Header */}
      <div className="flex justify-between items-center px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Brand Name</span>
        <span>Quantity Logged</span>
      </div>

      {/* Manifest Table Layout */}
      <div className="bg-white rounded-xl border border-slate-200/60 p-3.5 shadow-3xs space-y-2">
        {items.map((item, index) => {
          const showSeparationLine = index > 0 && index % 6 === 0;

          return (
            <React.Fragment key={item.brandId}>
              {showSeparationLine && (
                <div className="py-1">
                  <div className="border-t border-dashed border-slate-200" />
                </div>
              )}

              <div className="flex justify-between items-center py-1 px-1">
                <span className="text-sm font-medium text-slate-700 tracking-tight">
                  {item.brandName}
                </span>
                <div className="flex items-baseline font-bold text-slate-900">
                  <span className="text-sm tracking-tight">{item.quantity}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase ml-0.5 select-none">M</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ACTION BLOCK FOOTER HUB */}
      <div className="flex items-center gap-x-2.5 pt-1.5">
        <button
          type="button"
          onClick={onModifyClick}
          className="flex-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-x-1"
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <span>Modify</span>
        </button>
        
        <button
          type="button"
          onClick={onApproveClick}
          disabled={isSubmitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-lg transition-colors shadow-3xs flex items-center justify-center gap-x-1"
        >
          {isSubmitting ? (
            <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{isSubmitting ? 'Delivering...' : 'Delivered'}</span>
        </button>
      </div>

    </div>
  );
}