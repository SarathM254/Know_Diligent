import React from 'react';

export default function BillingPreviewSheet({ finalPreviewPayload }) {
  
  // Guard check: Render a clean empty state if no quantities were entered
  if (!finalPreviewPayload || finalPreviewPayload.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 p-8 text-center">
        <p className="text-sm font-medium text-slate-500">No brands selected for this run.</p>
        <p className="text-xs text-slate-400 mt-1">Go back and enter quantities to review.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-xs">
      
      {/* Structural Metadata Header Block */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Item Description
        </span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Load Quantity
        </span>
      </div>

      {/* Itemized Table Stack */}
      <div className="space-y-3">
        {finalPreviewPayload.map((item, index) => {
          
          // CRITICAL FEATURE IMPLEMENTATION: EVERY 6 ITEMS SEPARATION LINE
          // Checks if we have rendered an exact multiple of 6 items, and appends a decorative division break element
          const showSeparationLine = index > 0 && index % 6 === 0;

          return (
            <React.Fragment key={item.brandId}>
              {showSeparationLine && (
                <div className="py-1">
                  <div className="border-t border-dashed border-slate-200" />
                </div>
              )}

              {/* Minimalist Borderless Row Element */}
              <div className="flex justify-between items-center py-0.5">
                {/* Left Side: Clean Brand Name */}
                <span className="text-sm font-medium text-slate-800 tracking-tight">
                  {item.brandName}
                </span>

                {/* Right Side: High-Contrast Bold Metric Counter */}
                <div className="flex items-baseline gap-x-0.5 text-right font-bold text-slate-900">
                  <span className="text-base tracking-tight">{item.quantity}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase ml-0.5 select-none">
                    M
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Subtle Bottom Footer indicating line count */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-400 font-medium">
        <span>Total SKUs Loading:</span>
        <span className="text-slate-600 font-bold">{finalPreviewPayload.length} Items</span>
      </div>

    </div>
  );
}