import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function AIInvoiceModify({ categoriesData, initialData, onPreview, onCancel }) {
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  // Flatten categories into quick lookup arrays
  const allBrands = [];
  categoriesData.forEach(c => allBrands.push(...c.brands));

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: allBrands.reduce((acc, brand) => {
      const match = initialData.find(item => item.brandId === brand.id);
      acc[brand.id] = match && match.quantity > 0 ? String(match.quantity) : "";
      return acc;
    }, {})
  });

  const toggleCategory = (id) => {
    setExpandedCategoryId(prev => (prev === id ? null : id));
  };

  const handleBlurSanitization = (event, fieldId) => {
    let rawValue = event.target.value.trim();
    if (!rawValue) return;

    if (rawValue.startsWith('.')) {
      rawValue = '0' + rawValue;
    }

    const numericValue = parseFloat(rawValue);
    if (!isNaN(numericValue)) {
      setValue(fieldId, parseFloat(numericValue.toFixed(2)).toString());
    }
  };

  const handlePreviewAction = (data) => {
    const updatedData = Object.keys(data)
      .filter(key => parseFloat(data[key]) > 0)
      .map(key => {
        let foundName = "Unknown Product";
        for (const cat of categoriesData) {
          const match = cat.brands.find(b => b.id === key);
          if (match) { foundName = match.name; break; }
        }
        return {
          brandId: key,
          brandName: foundName,
          quantity: parseFloat(data[key])
        };
      });

    onPreview(updatedData);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto border-x border-slate-200/80 shadow-sm relative">
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-4 z-10 flex items-center justify-between shadow-2xs">
        <div>
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Manual Correction</span>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Modify Invoice Data</h2>
        </div>
        <button 
          type="button" 
          onClick={onCancel}
          className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {categoriesData.map((category, idx) => {
          const isOpen = expandedCategoryId === category.id;
          
          // Solid alternating color logic
          const isEven = idx % 2 === 0;
          const headerBg = isEven ? 'bg-slate-50/70 hover:bg-slate-100/80' : 'bg-indigo-50/40 hover:bg-indigo-100/50';
          const bodyBg = isEven ? 'bg-slate-50/30' : 'bg-indigo-50/20';
          const itemHoverBg = isEven ? 'hover:bg-slate-100/50' : 'hover:bg-indigo-100/50';
          const borderClass = isEven ? 'border-slate-200/60' : 'border-indigo-100/60';

          return (
            <div key={category.id} className={`rounded-xl border overflow-hidden shadow-xs transition-all duration-200 ${borderClass}`}>
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`w-full px-4 py-3.5 flex items-center justify-between transition-colors duration-150 ${headerBg}`}
              >
                <span className="text-sm font-bold text-slate-800 tracking-tight">{category.name}</span>
                <svg className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isOpen && (
                <div className={`border-t ${borderClass} divide-y ${isEven ? 'divide-slate-200/50' : 'divide-indigo-100/50'} ${bodyBg}`}>
                  {category.brands.map((brand) => (
                    <div key={brand.id} className={`px-4 py-3 flex items-center justify-between gap-x-4 transition-colors ${itemHoverBg}`}>
                      <span className="text-sm font-medium text-slate-800">{brand.name}</span>
                      
                      <div className="relative flex items-center max-w-25">
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          className="w-full text-right font-semibold text-slate-900 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 pr-7 pl-2.5 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                          {...register(brand.id)}
                          onBlur={(e) => handleBlurSanitization(e, brand.id)}
                        />
                        <span className="absolute right-2.5 text-[11px] font-bold text-slate-400 select-none pointer-events-none">M</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-slate-200/80 p-4 shadow-sm z-10">
        <button
          type="button"
          onClick={handleSubmit(handlePreviewAction)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide transition-colors flex items-center justify-center shadow-xs"
        >
          Preview Changes
        </button>
      </div>
    </div>
  );
}
