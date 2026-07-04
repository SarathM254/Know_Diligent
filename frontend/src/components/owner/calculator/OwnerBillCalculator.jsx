import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import BillingEntryForm from '../../salesman/BillingEntryForm';
import BillingPreviewSheet from '../../salesman/BillingPreviewSheet';
import { getCategories, getBrands } from '../../../api/inventoryApi';
import { useNavigate } from 'react-router-dom';

export default function OwnerBillCalculator() {
    const navigate = useNavigate();
    const [liveCategories, setLiveCategories] = useState([]);
    
    // Holds both pricing models internally to calculate without refetching
    const [wholesaleRates, setWholesaleRates] = useState({});
    const [retailRates, setRetailRates] = useState({});
    
    // Toggle state: 'wholesale' | 'retail'
    const [priceMode, setPriceMode] = useState('wholesale');
    
    const [loading, setLoading] = useState(true);

    const { register, handleSubmit, watch, setValue, reset } = useForm({});

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
                
                const wRates = {};
                const rRates = {};
                const defaultVals = {};
                brnds.forEach(b => {
                    wRates[b._id] = b.wholesalePrice || 0;
                    rRates[b._id] = b.retailPrice || 0;
                    defaultVals[b._id] = "";
                });

                setLiveCategories(structuredCats);
                setWholesaleRates(wRates);
                setRetailRates(rRates);
                reset(defaultVals);
            } catch (error) {
                console.error("Failed to load inventory:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, [reset]);

    const runningFormValues = watch();
    const [currentStep, setCurrentStep] = useState(1);
    const [finalPreviewPayload, setFinalPreviewPayload] = useState([]);
    const [expandedCategoryId, setExpandedCategoryId] = useState(null);
    
    const toggleCategory = (id) => {
      setExpandedCategoryId(prev => (prev === id ? null : id));
    };

    const handleBlurSanitization = (event, fieldId) => {
      let rawValue = event.target.value.trim();
      if (!rawValue) return;
      if (rawValue.startsWith('.')) rawValue = '0' + rawValue;
      const numericValue = parseFloat(rawValue);
      if (!isNaN(numericValue)) {
        setValue(fieldId, parseFloat(numericValue.toFixed(2)).toString());
      }
    };

    const compiledCeiledTotalValue = () => {
      let rawSum = 0;
      const activeRates = priceMode === 'wholesale' ? wholesaleRates : retailRates;
      Object.keys(runningFormValues).forEach(brandId => {
        const quantity = parseFloat(runningFormValues[brandId]);
        if (!isNaN(quantity) && quantity > 0) {
          const structuralRate = activeRates[brandId] || 0;
          rawSum += quantity * structuralRate;
        }
      });
      return Math.ceil(rawSum);
    };

    const processFormPreviewStep = (data) => {
        const activeRates = priceMode === 'wholesale' ? wholesaleRates : retailRates;
        const activeSubmissions = Object.keys(data)
            .filter(key => parseFloat(data[key]) > 0)
            .map(key => {
                let foundName = "Unknown Product";
                for (const cat of liveCategories) {
                    const match = cat.brands.find(b => b.id === key);
                    if (match) { foundName = match.name; break; }
                }
                return {
                    brandId: key,
                    brandName: foundName,
                    quantity: parseFloat(data[key]),
                    rate: activeRates[key]
                };
            });
        setFinalPreviewPayload(activeSubmissions);
        setCurrentStep(2);
    };

    const handleNavigationBackRoute = () => {
        if (currentStep === 2) setCurrentStep(1);
        else navigate('/owner');
    };

    return (
        <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-between max-w-md rounded-2xl mx-auto border-x border-slate-200/80 shadow-sm relative">

            <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-2 flex items-center gap-x-4 z-10 shadow-xs">
                <button
                    type="button"
                    onClick={handleNavigationBackRoute}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors duration-150 shrink-0"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {currentStep === 1 ? "Bill Calculator" : "Review Output"}
                    </h2>
                </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 animate-pulse">Loading Rates...</div>
            ) : currentStep === 1 ? (
              <BillingEntryForm 
                register={register}
                mockCategories={liveCategories}
                expandedCategoryId={expandedCategoryId}
                toggleCategory={toggleCategory}
                handleBlurSanitization={handleBlurSanitization}
                handleSubmit={handleSubmit}
                onPreviewSubmit={processFormPreviewStep}
              />
            ) : (
              <div className="flex-1 p-4 overflow-y-auto">
                <BillingPreviewSheet finalPreviewPayload={finalPreviewPayload} />
              </div>
            )}

            <div className="bg-white border-t border-slate-200/80 p-4 shadow-sm sticky bottom-0 z-10">
                <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                        Evaluated Value:
                    </span>
                    <span className="text-2xl font-black text-indigo-900 tracking-tight">
                        ₹{compiledCeiledTotalValue().toLocaleString('en-IN')}
                    </span>
                </div>

                {currentStep === 1 ? (
                    <div className="flex items-center justify-between gap-4">
                        {/* Custom Pricing Toggle Slider */}
                        <div className="relative flex items-center bg-slate-100 p-1 rounded-full w-full max-w-[180px] shadow-inner">
                            <div 
                                className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-out ${priceMode === 'retail' ? 'translate-x-[100%]' : 'translate-x-0'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setPriceMode('wholesale')}
                                className={`relative flex-1 py-2 text-xs font-bold z-10 transition-colors ${priceMode === 'wholesale' ? 'text-slate-800' : 'text-slate-400'}`}
                            >
                                Wholesale
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriceMode('retail')}
                                className={`relative flex-1 py-2 text-xs font-bold z-10 transition-colors ${priceMode === 'retail' ? 'text-slate-800' : 'text-slate-400'}`}
                            >
                                Retail
                            </button>
                        </div>

                        {/* Trigger submission using form hook via native external link */}
                        <button
                            type="button"
                            onClick={() => document.getElementById('submit-billing-form')?.click()}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm tracking-wide transition-colors flex items-center justify-center shadow-md"
                        >
                            Preview
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => navigate('/owner')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm tracking-wide transition-colors flex items-center justify-center shadow-md"
                    >
                        Done
                    </button>
                )}
            </div>
        </div>
    );
}
