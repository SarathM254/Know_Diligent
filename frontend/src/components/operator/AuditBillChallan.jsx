import React, { useState, useEffect } from 'react';

export default function AuditBillChallan({ items, isAlreadyBilled, onChallanCleared }) {
  // Store verified state locally for each individual item row
  const [verifiedRows, setVerifiedRows] = useState({});

  // CRITICAL FIX: If the bill is already processed in DB, force-fill all check states as true
  useEffect(() => {
    if (isAlreadyBilled) {
      const fullCheckedMap = items.reduce((acc, item) => {
        acc[item.brandId] = true;
        return acc;
      }, {});
      setVerifiedRows(fullCheckedMap);
    }
  }, [isAlreadyBilled, items]);

  const toggleRowVerification = (itemId) => {
    // Prevent modifying checks if the bill state is already finalized as "Billed"
    if (isAlreadyBilled) return;

    setVerifiedRows(prev => {
      const updated = { ...prev, [itemId]: !prev[itemId] };
      
      // SAFE STATE BUBBLING: Calculate completeness right inside the event handler 
      // instead of a toxic background useEffect dependency hook.
      const allChecked = items.every(item => !!updated[item.brandId]);
      onChallanCleared(allChecked);
      
      return updated;
    });
  };

  return (
    <div className="p-4 bg-slate-50/50 space-y-3">
      
      {/* Table Column Labels */}
      <div className="flex justify-between items-center px-1 text-[14px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Brand Name</span>
        <div className="flex items-center gap-x-8 pr-2">
          <span>Load</span>
          <span>Status</span>
        </div>
      </div>

      {/* Itemized Stack */}
      <div className="space-y-2 bg-white rounded-xl border border-slate-200/60 p-3.5 shadow-2xs">
        {items.map((item, index) => {
          const isChecked = !!verifiedRows[item.brandId];
          const showSeparationLine = index > 0 && index % 6 === 0;

          return (
            <React.Fragment key={item.brandId}>
              {showSeparationLine && (
                <div className="py-1">
                  <div className="border-t border-dashed border-slate-200" />
                </div>
              )}

              {/* Interactive Row */}
              <div 
                onClick={() => toggleRowVerification(item.brandId)}
                className={`flex justify-between items-center py-1.5 px-2 rounded-lg transition-all duration-150 select-none ${
                  isAlreadyBilled 
                    ? 'cursor-not-allowed bg-emerald-50/30 text-emerald-800/60 line-through decoration-emerald-200'
                    : isChecked 
                      ? 'bg-emerald-50/60 text-emerald-900 line-through decoration-emerald-300 cursor-pointer' 
                      : 'hover:bg-slate-50 text-slate-800 cursor-pointer'
                }`}
              >
                <span className="text-sm font-medium">
                  {item.brandName}
                </span>

                <div className="flex items-center gap-x-6 shrink-0">
                  <div className="flex items-baseline font-bold text-slate-900 w-12 justify-end">
                    <span className="text-sm tracking-tight">{item.quantity}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase ml-0.5">M</span>
                  </div>

                  {/* Verification Indicator Button */}
                  <button
                    type="button"
                    disabled={isAlreadyBilled}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowVerification(item.brandId);
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 border ${
                      isChecked 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                        : 'bg-white border-slate-200 text-transparent'
                    } ${isAlreadyBilled ? 'opacity-70 cursor-not-allowed' : 'hover:border-slate-400'}`}
                  >
                    <svg className="w-3.5 h-3.5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                </div>

              </div>
            </React.Fragment>
          );
        })}
      </div>

    </div>
  );
}