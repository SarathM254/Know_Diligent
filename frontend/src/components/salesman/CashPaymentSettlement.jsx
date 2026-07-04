import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { submitDailyPayment } from '../../api/paymentApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10];

export default function CashPaymentSettlement({ salesman, onSettlementSuccess }) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize react-hook-form with structured object layouts
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      cashBreakdown: DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: "" }), {}),
      changeAmount: "",
      phonePeAmount: "",
      foodAmount: ""
    }
  });

  // Watch values reactively to execute fast server-side UI math totals
  const formValues = watch();

  /*
    CRITICAL FEATURE IMPLEMENTATION: PHYSICAL CASH COUNT INTEGER ENFORCEMENT
    Blocks decimal points, minus signs, and exponential symbols at the hardware input layer.
    Salesmen can only physically enter positive whole counts of currency notes.
  */
  const blockDecimalAndSigns = (e) => {
    if (['.', '-', '+', 'e', 'E'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Compile individual currency weights instantly using watched input memory fields
  const totalHandCash = DENOMINATIONS.reduce((sum, denom) => {
    const count = parseInt(formValues.cashBreakdown?.[denom] || 0, 10);
    return sum + (denom * count);
  }, parseInt(formValues.changeAmount || 0, 10));

  const phonePeAmountNum = parseFloat(formValues.phonePeAmount || 0);
  const foodAmountNum = parseFloat(formValues.foodAmount || 0);
  const cigarettesClearance = totalHandCash - (isNaN(foodAmountNum) ? 0 : foodAmountNum) + (isNaN(phonePeAmountNum) ? 0 : phonePeAmountNum);
  const totalPayment = cigarettesClearance + (isNaN(foodAmountNum) ? 0 : foodAmountNum);

  /*
    DIGITAL CURRENCY SANITIZATION:
    Allows decimals on PhonePe input, but cleans up inputs like ".5" to "0.5" on blur.
  */
  const handlePhonePeBlur = (e) => {
    let rawValue = e.target.value.trim();
    if (!rawValue) return;

    if (rawValue.startsWith('.')) {
      rawValue = '0' + rawValue;
    }

    const numericValue = parseFloat(rawValue);
    if (!isNaN(numericValue)) {
      setValue('phonePeAmount', parseFloat(numericValue.toFixed(2)).toString());
    }
  };

  const handleFormSubmission = async (data) => {
    setIsSubmitting(true);
    if (!salesman || !salesman._id) {
      toast.error("Salesman identity missing.");
      setIsSubmitting(false);
      return;
    }

    const finalizedPayload = {
      salesmanId: salesman._id,
      cashBreakdown: DENOMINATIONS.reduce((acc, d) => {
        acc[d] = parseInt(data.cashBreakdown[d] || 0, 10);
        return acc;
      }, {}),
      changeAmount: parseInt(data.changeAmount || 0, 10),
      phonePeAmount: parseFloat(data.phonePeAmount || 0),
      foodAmount: parseFloat(data.foodAmount || 0)
    };

    try {
      await submitDailyPayment(finalizedPayload);
      toast.success("Payment submitted successfully for verification.");
      navigate('/salesman');
      if (onSettlementSuccess) onSettlementSuccess(finalizedPayload);
    } catch (error) {
      console.error("Failed to submit payment:", error);
      toast.error(error.response?.data?.error || "Error submitting payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen max-w-md mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
      
      {/* Component Title Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-3 flex items-center gap-x-4 z-10 shadow-xs">
                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => navigate('/salesman')}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                    aria-label="Navigate Back"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Cash Payment
                    </h2>
                </div>
            </div>
      

      {/* Core Matrix Workings Section */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        
        {/* Physical Denominations Segment Layout */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-x-2">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M4.5 19.5h15M5.25 4.5V10.5m13.5-6v6m-12 9v-1.5m10.5 1.5v-1.5m-7.5-6h4.5m-5.25 3h6" />
            </svg>
            Physical Cash Denominations
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {DENOMINATIONS.map(denom => (
              <div 
                key={denom} 
                className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3 transition-all duration-150 focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-xs"
              >
                <span className="w-10 text-base font-bold text-emerald-700 pl-1">₹{denom}</span>
                <span className="text-slate-300 text-base font-semibold select-none px-2">×</span>
                <input 
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  onKeyDown={blockDecimalAndSigns}
                  className="w-full text-right font-bold text-slate-800 bg-transparent border-none outline-none pr-1 focus:ring-0 text-sm placeholder:text-slate-300"
                  {...register(`cashBreakdown.${denom}`)}
                />
              </div>
            ))}
            
            {/* Loose Change Input Field */}
            <div className="col-span-2 flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3 transition-all duration-150 focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-xs">
              <span className="flex-1 text-base font-bold text-emerald-700 pl-1">Loose Change (₹)</span>
              <span className="text-slate-300 text-base font-semibold select-none px-2">+</span>
              <input 
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                onKeyDown={blockDecimalAndSigns}
                className="w-24 text-right font-bold text-slate-800 bg-transparent border-none outline-none pr-1 focus:ring-0 text-sm placeholder:text-slate-300"
                {...register('changeAmount')}
              />
            </div>
          </div>

          {/* Cash Subtotal Balance Notification Bar */}
          <div className="mt-3.5 flex justify-between items-center p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
            <span className="text-lg font-semibold text-slate-500">Physical Cash:</span>
            <span className="text-lg font-black text-slate-800">₹{totalHandCash.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Food Transfer Segment Layout */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-x-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M10 7v10.9" />
              <path d="M14 6.1V17" />
              <path d="M16 7V3a1 1 0 0 1 1.707-.707 2.5 2.5 0 0 0 2.152.717 1 1 0 0 1 1.131 1.131 2.5 2.5 0 0 0 .717 2.152A1 1 0 0 1 21 8h-4" />
              <path d="M16.536 7.465a5 5 0 0 0-7.072 0l-2 2a5 5 0 0 0 0 7.07 5 5 0 0 0 7.072 0l2-2a5 5 0 0 0 0-7.07" />
              <path d="M8 17v4a1 1 0 0 1-1.707.707 2.5 2.5 0 0 0-2.152-.717 1 1 0 0 1-1.131-1.131 2.5 2.5 0 0 0-.717-2.152A1 1 0 0 1 3 16h4" />
            </svg>
            Food Collection
          </h3>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-base font-bold text-slate-400 select-none pointer-events-none">₹</span>
            <input 
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0.00"
              onBlur={(e) => {
                let val = e.target.value.trim();
                if (!val) return;
                if (val.startsWith('.')) val = '0' + val;
                const num = parseFloat(val);
                if (!isNaN(num)) setValue('foodAmount', parseFloat(num.toFixed(2)).toString());
              }}
              className="w-full pl-8 pr-4 py-3 text-base font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 transition-all duration-150 shadow-xs placeholder:text-slate-300"
              {...register('foodAmount')}
            />
          </div>
        </div>

        {/* PhonePe Digital Transfer Segment Layout */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-x-2">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
            Digital Payment (PhonePe / UPI)
          </h3>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-base font-bold text-slate-400 select-none pointer-events-none">₹</span>
            <input 
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0.00"
              onBlur={handlePhonePeBlur}
              className="w-full pl-8 pr-4 py-3 text-base font-bold text-slate-800 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 transition-all duration-150 shadow-xs placeholder:text-slate-300"
              {...register('phonePeAmount')}
            />
          </div>
        </div>

      </div>

      {/* Persistent Grand Total & Submit Block */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-center mb-1 px-1.5">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Cigarettes Clearance</span>
          <span className="text-xl font-black text-slate-900 tracking-tight">₹{cigarettesClearance.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between items-center mb-4 px-1.5">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Food Clearance</span>
          <span className="text-xl font-black text-slate-900 tracking-tight">₹{foodAmountNum.toLocaleString('en-IN')}</span>
        </div>
        <button 
          type="button"
          onClick={handleSubmit(handleFormSubmission)}
          disabled={totalPayment === 0 || isSubmitting}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl tracking-wide transition-all duration-150 shadow-xs disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-x-1.5"
        >
          {isSubmitting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{isSubmitting ? 'Submitting...' : 'Submit Cashout Summary'}</span>
        </button>
      </div>

    </div>
  );
}