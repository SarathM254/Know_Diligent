import React, { useState, useEffect } from 'react';
import { getCategories, getBrands } from '../../api/inventoryApi';
import { useNavigate } from 'react-router-dom';

export default function SalesmanPriceList() {
  const navigate = useNavigate();
  const [liveCategories, setLiveCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
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
            name: b.name,
            retail: b.retailPrice || 0
          }))
        }));
        setLiveCategories(structuredCats);
      } catch (error) {
        console.error("Failed to load prices", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80 shadow-sm relative pb-10">
      
      {/* Sticky Dashboard Section Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center gap-x-4 z-10 shadow-2xs">
        <button type="button" onClick={() => navigate('/salesman')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Retail Prices</h2>
          <p className="text-[11px] text-slate-400">Current market pricing for all brands</p>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-xs">
          
          {/* Structural Metadata Header Block */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Brand Name
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Retail Price
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-10 text-slate-400 animate-pulse text-sm">
              Loading latest price list...
            </div>
          ) : (
            <div className="space-y-5">
              {liveCategories.map((category, idx) => {
                const isEven = idx % 2 === 0;
                const headerBg = isEven ? 'bg-slate-50/70 text-slate-800 border-slate-200' : 'bg-indigo-50/40 text-indigo-900 border-indigo-100';
                const bodyBg = isEven ? 'bg-slate-50/30' : 'bg-indigo-50/20';
                const itemHoverBg = isEven ? 'hover:bg-slate-100/50' : 'hover:bg-indigo-100/50';

                return (
                  <div key={category.id} className={`rounded-xl border overflow-hidden ${isEven ? 'border-slate-200' : 'border-indigo-100'}`}>
                    <h3 className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 border-b ${headerBg}`}>
                      {category.name}
                    </h3>
                    <div className={`divide-y ${isEven ? 'divide-slate-200/50' : 'divide-indigo-100/50'} ${bodyBg}`}>
                      {category.brands.map((brand) => (
                        <div key={brand.id} className={`flex justify-between items-center px-4 py-2.5 transition-colors ${itemHoverBg}`}>
                          <span className="text-sm font-medium text-slate-800 tracking-tight flex items-center">
                            {brand.name}
                            <span className="text-[9px] font-bold text-slate-400 ml-1">(R)</span>
                          </span>
                          <div className="flex items-baseline text-right">
                            <span className="text-[13px] font-bold text-slate-900 tracking-tight">
                              ₹{brand.retail.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 ml-1 whitespace-nowrap">
                              per M
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
