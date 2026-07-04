import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getCategories, getBrands } from '../../../api/inventoryApi';

export default function OwnerBillEdit({ bill, onSaveOverride, onCancel }) {
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [mockCategories, setMockCategories] = useState([]);
  const [ratesMapping, setRatesMapping] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with the exact current live values inside this specific bill snapshot
  const { register, handleSubmit, setValue, reset } = useForm({
    defaultValues: bill.items.reduce((acc, item) => {
      acc[item.brandId] = item.quantity || "";
      return acc;
    }, {})
  });

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const [cats, brnds] = await Promise.all([getCategories(), getBrands()]);
        const structuredCats = cats.map(cat => ({
          id: cat._id,
          name: cat.name,
          brands: brnds.filter(b => {
            const bCatId = b.categoryId && typeof b.categoryId === 'object' ? b.categoryId._id : b.categoryId;
            return bCatId === cat._id;
          }).map(b => ({
            id: b._id,
            name: b.name
          }))
        }));
        
        const newRates = {};
        brnds.forEach(b => {
          newRates[b._id] = b.retailPrice || 0;
        });

        setMockCategories(structuredCats);
        setRatesMapping(newRates);
      } catch (error) {
        console.error("Failed to load inventory for editing:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const toggleCategory = (id) => {
    setExpandedCategoryId(prev => (prev === id ? null : id));
  };

  /*
    CRITICAL FEATURE REUSE: LIVE CONTEXT-AWARE INTEGER ZERO SANITIZATION
    Ensures that if the owner types ".5", it auto-pads to "0.5" instantly on blur, 
    preserving identical alignment with the salesman input mechanics.
  */
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

  const handleFormSubmission = async (data) => {
    setIsSubmitting(true);
    // Format only items that have an actual quantity value greater than zero
    const updatedItems = [];
    
    mockCategories.forEach(cat => {
      cat.brands.forEach(b => {
        const qty = parseFloat(data[b.id]);
        if (!isNaN(qty) && qty > 0) {
          updatedItems.push({
            brandId: b.id,
            brandName: b.name,
            quantity: qty,
            rate: ratesMapping[b.id] || 0
          });
        }
      });
    });

    try {
      await onSaveOverride(bill._id, updatedItems);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 font-bold animate-pulse">Loading inventory manifest...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto">
      
      {/* Editing Top Header Indicator */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-4 z-10 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Management Override</span>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Edit Bill: {bill.salesmanName}</h2>
        </div>
        <button 
          type="button" 
          onClick={onCancel}
          className="text-xs font-bold  text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Main Dynamic Accordion Loop Area */}
      <form onSubmit={handleSubmit(handleFormSubmission)} className="flex-1 p-4 space-y-3 overflow-y-auto">
        {mockCategories.map((category, idx) => {
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
                className={`w-full px-3.5 py-3 flex items-center justify-between transition-colors duration-150 ${headerBg}`}
              >
                <span className="text-sm font-bold text-slate-800 tracking-tight">{category.name}</span>
                <svg className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isOpen && (
                <div className={`border-t ${borderClass} divide-y ${isEven ? 'divide-slate-200/50' : 'divide-indigo-100/50'} ${bodyBg}`}>
                  {category.brands.map((brand) => (
                    <div key={brand.id} className={`px-3.5 py-2 flex items-center justify-between gap-x-4 transition-colors ${itemHoverBg}`}>
                      <span className="text-sm font-medium text-slate-800">{brand.name}</span>
                      
                      <div className="relative flex items-center max-w-25">
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          className="w-full text-right font-semibold text-slate-900 bg-slate-50/80 border border-slate-200 rounded-lg py-1.5 pr-7 pl-2.5 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
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
      </form>

      {/* Persistent Bottom Action Confirmation Trigger */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200/80 p-4 shadow-sm z-10">
        <button
          type="button"
          onClick={handleSubmit(handleFormSubmission)}
          disabled={isSubmitting}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide transition-colors flex items-center justify-center gap-x-2"
        >
          {isSubmitting && (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span>{isSubmitting ? 'Saving...' : 'Done'}</span>
        </button>
      </div>

    </div>
  );
}