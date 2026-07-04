import React from 'react';

export default function BillingEntryForm({ 
  register, 
  mockCategories, 
  expandedCategoryId, 
  toggleCategory, 
  handleBlurSanitization,
  handleSubmit,
  onPreviewSubmit
}) {
  return (
    <form onSubmit={handleSubmit(onPreviewSubmit)} className="flex-1 p-4 space-y-3 overflow-y-auto">
      {mockCategories.map((category, idx) => {
        const isOpen = expandedCategoryId === category.id;
        
        // Solid alternating color logic
        const isEven = idx % 2 === 0;
        const headerBg = isEven ? 'bg-slate-50/70 hover:bg-slate-100/80' : 'bg-indigo-50/40 hover:bg-indigo-100/50';
        const bodyBg = isEven ? 'bg-slate-50/30' : 'bg-indigo-50/20';
        const itemHoverBg = isEven ? 'hover:bg-slate-100/50' : 'hover:bg-indigo-100/50';
        const borderClass = isEven ? 'border-slate-200/60' : 'border-indigo-100/60';
        
        return (
          <div 
            key={category.id} 
            className={`rounded-xl border overflow-hidden shadow-xs transition-all duration-200 ${borderClass}`}
          >
            {/* Category Striver-Style Toggled Title Selector Bar */}
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className={`w-full px-3.5 py-3 flex items-center justify-between transition-colors duration-150 ${headerBg}`}
            >
              <span className="text-sm font-bold text-slate-800 tracking-tight">
                {category.name}
              </span>
              
              {/* Clean structural Chevron Indicator to convey toggle state layout attributes */}
              <svg 
                className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Collapsible Content Drawer Container */}
            {isOpen && (
              <div className={`border-t ${borderClass} divide-y ${isEven ? 'divide-slate-200/50' : 'divide-indigo-100/50'} ${bodyBg}`}>
                {category.brands.map((brand) => (
                  <div 
                    key={brand.id} 
                    className={`px-3.5 py-2 flex items-center justify-between gap-x-4 transition-colors ${itemHoverBg}`}
                  >
                    {/* Left Column Brand Product Descriptor */}
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-slate-800 leading-snug">
                        {brand.name}
                      </span>
                    </div>

                    {/* Right Column Mathematical Quantity Action Box */}
                    <div className="flex items-center gap-x-2 shrink-0">
                      <div className="relative flex items-center max-w-25">
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          className="w-full text-right font-semibold text-slate-900 bg-slate-50/80 border border-slate-200 rounded-lg py-1 pr-7 pl-2.5 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all duration-150"
                          {...register(brand.id)}
                          onBlur={(e) => handleBlurSanitization(e, brand.id)}
                        />
                        <span className="absolute right-2.5 text-[11px] font-bold text-slate-400 select-none pointer-events-none">
                          M
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Hidden button to hook form submission up to master external controller clicks safely */}
      <button id="submit-billing-form" type="submit" className="hidden" />
    </form>
  );
}