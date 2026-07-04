import React, { useState, useEffect, useRef } from 'react';
import InventoryModifyScreen from './InventoryModifyScreen';
import AIInvoiceReview from './AIInvoiceReview';
import AIInvoiceModify from './AIInvoiceModify';
import { getCategories, getBrands, upsertBrand, bulkAddInventory, parseInvoiceWithAI } from '../../../api/inventoryApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function InventoryControlPortal() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // AI Workflow States: 'idle' | 'uploading' | 'review' | 'modify'
  const [aiState, setAiState] = useState('idle');
  const [aiExtractedData, setAiExtractedData] = useState([]);
  const [aiRemarks, setAiRemarks] = useState('');
  const fileInputRef = useRef(null);

  const [categoriesData, setCategoriesData] = useState([]);
  const [inventoryState, setInventoryState] = useState([]);

  const loadInventory = async () => {
    setLoading(true);
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
      setCategoriesData(structuredCats);

      setInventoryState(brnds.map(b => ({
        brandId: b._id,
        brandName: b.name,
        quantity: Math.round((b.inventoryCount || 0) * 100) / 100
      })));
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleSaveInventory = async (updatedInventory) => {
    setIsSyncing(true);
    try {
      // Filter out items that haven't changed to prevent flooding the backend with unnecessary API calls
      const changedItems = updatedInventory.filter((item, index) => {
        const originalItem = inventoryState.find(i => i.brandId === item.brandId);
        return !originalItem || originalItem.quantity !== item.quantity;
      });

      setInventoryState(updatedInventory);
      setIsEditing(false);

      for (const item of changedItems) {
        await upsertBrand({ id: item.brandId, inventoryCount: item.quantity });
      }
    } catch (error) {
      console.error("Failed to sync inventory:", error);
      toast.error("Failed to sync some inventory items: " + (error.response?.data?.error || error.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInvoiceUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setAiState('uploading');
    try {
      const extracted = await parseInvoiceWithAI(file);
      setAiExtractedData(extracted.items || []);
      setAiRemarks(extracted.remarks || '');
      setAiState('review');
    } catch (error) {
      console.error("Failed to parse invoice", error);
      toast.error("Failed to parse invoice via AI.");
      setAiState('idle');
    }
    
    // Clear the input so the same file can be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAiAccept = async () => {
    setIsAccepting(true);
    try {
      // Execute the bulk backend add operation
      await bulkAddInventory(aiExtractedData);
      
      // Reload inventory to show fresh numbers
      await loadInventory();
      setAiState('idle');
    } catch (error) {
      console.error("Failed to commit AI inventory", error);
      toast.error("Failed to sync AI inventory.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isEditing) {
    return (
      <InventoryModifyScreen 
        mockCategories={categoriesData}
        inventoryState={inventoryState}
        isSubmitting={isSyncing}
        onSave={handleSaveInventory}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  if (aiState === 'review') {
    return (
      <AIInvoiceReview 
        extractedData={aiExtractedData}
        remarks={aiRemarks}
        isAccepting={isAccepting}
        onAccept={handleAiAccept}
        onModify={() => setAiState('modify')}
        onCancel={() => setAiState('idle')}
      />
    );
  }

  if (aiState === 'modify') {
    return (
      <AIInvoiceModify 
        categoriesData={categoriesData}
        initialData={aiExtractedData}
        onPreview={(updatedData) => {
          setAiExtractedData(updatedData);
          setAiState('review');
        }}
        onCancel={() => setAiState('idle')}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80 shadow-sm relative">
      
      {/* Sticky Dashboard Section Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center gap-x-4 z-10 shadow-2xs">
        <button type="button" onClick={() => navigate('/owner')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Inventory Control</h2>
          <p className="text-[11px] text-slate-400">Monitor warehouse stock levels & factory shipments</p>
        </div>
      </div>

      {/* Main Stream Core Feed: The List of Brands */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-xs">
          
          {/* Structural Metadata Header Block */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Brand Name
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock Quantity
            </span>
          </div>

          {/* Itemized Table Stack */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-slate-400 py-4 animate-pulse">Loading inventory...</div>
            ) : categoriesData.length === 0 ? (
              <div className="text-center text-slate-400 py-4">No inventory found.</div>
            ) : (
              categoriesData.map((category) => (
                <div key={category.id} className="mb-2 last:mb-0">
                  <h3 className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1.5">
                    {category.name}
                  </h3>
                <div className="space-y-1">
                  {category.brands.map((brand) => {
                    const item = inventoryState.find(i => i.brandId === brand.id);
                    if (!item) return null;
                    
                    return (
                      <div key={brand.id} className="flex justify-between items-center py-0.5">
                        <span className="text-sm font-medium text-slate-800 tracking-tight">
                          {item.brandName}
                        </span>
                        <div className="flex items-baseline gap-x-0.5 text-right font-bold text-slate-900">
                          <span className="text-base tracking-tight">{Math.round(item.quantity * 100) / 100}</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase ml-0.5 select-none">
                            M
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )))}
          </div>

        </div>
      </div>

      {/* Persistent Bottom Action Buttons Area */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200/80 p-4 shadow-sm z-10 flex gap-3">
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          accept="application/pdf,image/*" 
          ref={fileInputRef} 
          onChange={handleInvoiceUpload} 
          className="hidden" 
        />

        {/* Left Button: Upload Invoice */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 flex flex-col items-center justify-center transition-colors shadow-2xs group"
        >
          <div className="flex flex-col items-center justify-center gap-y-1">
            <div className="flex items-center gap-x-1.5 text-sm font-bold">
              <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>Invoice</span>
            </div>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/20 uppercase tracking-widest">
              Gemini 2.5 Flash
            </span>
          </div>
        </button>

        {/* Right Button: Modify Inventory */}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 flex items-center justify-center gap-x-2 transition-colors shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <span className="text-sm font-bold">Modify</span>
        </button>

      </div>

      {/* AI Processing Overlay */}
      {aiState === 'uploading' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-y-4 max-w-[280px]">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              <svg className="w-6 h-6 text-indigo-600 absolute" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">AI is analyzing the invoice...</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Extracting brand data via Gemini 2.5 Flash</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
