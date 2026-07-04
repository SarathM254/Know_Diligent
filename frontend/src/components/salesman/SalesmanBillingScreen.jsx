import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import BillingEntryForm from './BillingEntryForm';
import BillingPreviewSheet from './BillingPreviewSheet';
import { createOrUpdateDraftBill } from '../../api/billApi';
import { getCategories, getBrands } from '../../api/inventoryApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';

export default function SalesmanBillingScreen({ salesman }) {
    const navigate = useNavigate();
    const [liveCategories, setLiveCategories] = useState([]);
    const [liveRates, setLiveRates] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLockedView, setIsLockedView] = useState(false);
    const [lockedBillValue, setLockedBillValue] = useState(0);

    const { register, handleSubmit, watch, setValue, reset } = useForm({});

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const [cats, brnds, historyRes, dateRes] = await Promise.all([
                    getCategories(), 
                    getBrands(),
                    apiClient.get(`/bills/history/${salesman._id}`),
                    apiClient.get('/bills/global-date')
                ]);
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
                const defaultVals = {};
                brnds.forEach(b => {
                    newRates[b._id] = b.retailPrice || 0;
                    defaultVals[b._id] = "";
                });

                setLiveCategories(structuredCats);
                setLiveRates(newRates);
                reset(defaultVals);

                const latestBill = historyRes.data[0];
                const operationalDate = dateRes.data.operationalDate;

                if (latestBill && latestBill.billingDate === operationalDate && latestBill.status !== 'draft') {
                    const formattedPayload = latestBill.items.map(item => ({
                        brandId: item.brandId,
                        brandName: item.brandName,
                        quantity: item.quantity,
                        rate: item.rateSnapShot
                    }));
                    setFinalPreviewPayload(formattedPayload);
                    setLockedBillValue(latestBill.totalBillValue);
                    setCurrentStep(2);
                    setIsLockedView(true);
                }
            } catch (error) {
                console.error("Failed to load inventory:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, [reset]);

    // Constantly monitors input metrics inside the parent context memory safely
    const runningFormValues = watch();

    // Step workflow management: 1 = Form Input Screen, 2 = Summary Review Screen
    const [currentStep, setCurrentStep] = useState(1);
    const [finalPreviewPayload, setFinalPreviewPayload] = useState([]);

    const [expandedCategoryId, setExpandedCategoryId] = useState(null);
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
        const sanitizedFixed = parseFloat(numericValue.toFixed(2));
        setValue(fieldId, sanitizedFixed.toString());
      }
    };

    /*
      CRITICAL FEATURE IMPLEMENTATION: REAL-TIME LEDGER VALUE AGGREGATION & WHOLE NUMBER CEILING LOCK
      Runs mathematical accumulation across every field array. If an incremental currency fraction is evaluated
      (e.g., 1230.25), the total is cleanly forced upwards to the next absolute whole number ceiling integer (1231).
    */
    const compiledCeiledTotalValue = () => {
      let rawSum = 0;
      Object.keys(runningFormValues).forEach(brandId => {
        const quantity = parseFloat(runningFormValues[brandId]);
        if (!isNaN(quantity) && quantity > 0) {
          const structuralRate = liveRates[brandId] || 0;
          rawSum += quantity * structuralRate;
        }
      });
      return Math.ceil(rawSum);
    };

    const processFormPreviewStep = (data) => {
        // Collect and format only active entered quantities
        const activeSubmissions = Object.keys(data)
            .filter(key => parseFloat(data[key]) > 0)
            .map(key => {
                // Look up corresponding brand name from nested structures
                let foundName = "Unknown Product";
                for (const cat of liveCategories) {
                    const match = cat.brands.find(b => b.id === key);
                    if (match) { foundName = match.name; break; }
                }
                return {
                    brandId: key,
                    brandName: foundName,
                    quantity: parseFloat(data[key]),
                    rate: liveRates[key]
                };
            });

        setFinalPreviewPayload(activeSubmissions);
        setCurrentStep(2); // Advance DOM context cleanly to Step 2 review matrix panel
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (!salesman || !salesman._id) {
                toast.error("Salesman identity missing.");
                return;
            }
            
            await createOrUpdateDraftBill({
                salesmanId: salesman._id,
                items: finalPreviewPayload
            });
            
            toast.success("Bill submitted successfully!");
            navigate('/salesman');
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(error.response?.data?.error || "Failed to submit bill. It might be locked by management.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Safe navigation fallback logic wrapper
    const handleNavigationBackRoute = () => {
        if (isSubmitting) return;

        if (currentStep === 2 && !isLockedView) {
            setCurrentStep(1);
        } else {
            navigate('/salesman');
        }
    };

    return (
        <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-between max-w-md rounded-2xl mx-auto border-x border-slate-200/80 shadow-sm">

            {/* FIXED PERMANENT UNIVERSAL HEADER LAYER */}
            <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-2 flex items-center gap-x-4 z-10 shadow-xs">
                <button
                    type="button"
                    onClick={handleNavigationBackRoute}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors duration-150 shrink-0"
                    aria-label="Navigate Back"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        {currentStep === 1 ? "Bill Submission" : "Review Run Summary"}
                    </h2>
                </div>
            </div>

            {/* DYNAMIC CONTENT INJECTION BODY LAYER */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 animate-pulse">Loading Inventory Manifest...</div>
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
              <BillingPreviewSheet finalPreviewPayload={finalPreviewPayload} />
            )}

            {/* FIXED PERSISTENT BOTTOM TOTAL METRICS BLOCK */}
            <div className="bg-white border-t border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3.5 px-3.5">
                    <span className="text-xl font-bold text-slate-900 uppercase">
                        Bill Value:
                    </span>
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                        ₹{isLockedView ? lockedBillValue.toLocaleString('en-IN') : compiledCeiledTotalValue().toLocaleString('en-IN')}
                    </span>
                </div>

                {isLockedView ? null : currentStep === 1 ? (
                    <button
                        type="button"
                        onClick={() => document.getElementById('submit-billing-form').click()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide transition-all duration-150 shadow-xs flex items-center justify-center"
                    >
                        Review
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide transition-all duration-150 shadow-xs flex items-center justify-center gap-x-2"
                    >
                        {isSubmitting && (
                            <svg className="w-4 h-4 animate-spin text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        <span>{isSubmitting ? 'Submitting...' : 'Confirm & Submit Run'}</span>
                    </button>
                )}
            </div>

        </div>
    );
}