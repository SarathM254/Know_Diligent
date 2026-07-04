import React, { useState, useEffect } from 'react';
import { getCategories, getBrands, createCategory, upsertBrand } from '../../../api/inventoryApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function BrandManagerPortal() {
  const navigate = useNavigate();
  // --- STATE MANAGEMENT ---
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  // To track which category we are adding/editing a brand in (null means modal is closed)
  const [activeBrandCategoryId, setActiveBrandCategoryId] = useState(null);
  const [editingBrandId, setEditingBrandId] = useState(null);

  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandForm, setNewBrandForm] = useState({ name: '', code: '', wholesale: '', retail: '' });

  const loadData = async () => {
    try {
      setLoading(true);
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
          code: b.code || '',
          wholesale: b.wholesalePrice || 0,
          retail: b.retailPrice || 0
        }))
      }));
      setCategories(structuredCats);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- HANDLERS ---
  const toggleCategory = (id) => {
    setExpandedCategoryId(prev => (prev === id ? null : id));
  };

  const handleDeleteCategory = (e, category) => {
    e.stopPropagation();
    toast.error(`Category deletion is disabled in the current administrative context. Please contact support to remove "${category.name}".`, { duration: 5000 });
  };

  const handleDeleteBrand = (e, categoryId, brand) => {
    e.stopPropagation();
    toast.error(`Brand deletion is disabled. Try zeroing out the inventory or contacting support to remove "${brand.name}".`, { duration: 5000 });
  };

  const handleEditBrandClick = (e, categoryId, brand) => {
    e.stopPropagation();
    setActiveBrandCategoryId(categoryId);
    setEditingBrandId(brand.id);
    setNewBrandForm({
      name: brand.name,
      code: brand.code,
      wholesale: brand.wholesale,
      retail: brand.retail
    });
  };

  const handleCancelBrandForm = () => {
    setActiveBrandCategoryId(null);
    setEditingBrandId(null);
    setNewBrandForm({ name: '', code: '', wholesale: '', retail: '' });
  };

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await createCategory({ name: newCategoryName });
      setNewCategoryName('');
      setIsAddCategoryOpen(false);
      toast.success("Category created successfully!");
      loadData();
    } catch (error) {
      console.error("Failed to add category", error);
      toast.error("Failed to create category");
    }
  };

  const handleAddBrandSubmit = async (e) => {
    e.preventDefault();
    if (!newBrandForm.name.trim() || !newBrandForm.code.trim()) return;

    try {
      const payload = {
        name: newBrandForm.name,
        code: newBrandForm.code,
        categoryId: activeBrandCategoryId,
        wholesalePrice: parseFloat(newBrandForm.wholesale) || 0,
        retailPrice: parseFloat(newBrandForm.retail) || 0
      };

      if (editingBrandId) {
        payload.id = editingBrandId;
      }

      await upsertBrand(payload);
      toast.success("Brand saved successfully!");
      handleCancelBrandForm();
      loadData();
    } catch (error) {
      console.error("Failed to save brand", error);
      toast.error("Failed to save brand");
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-start max-w-md mx-auto border-x border-slate-200/80 shadow-sm relative pb-24">
      
      {/* Sticky Dashboard Section Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-3.5 flex items-center gap-x-4 z-10 shadow-2xs">
        <button type="button" onClick={() => navigate('/owner')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Brand Manager</h2>
          <p className="text-[11px] text-slate-400">Configure product lists & map wholesale price tiers</p>
        </div>
      </div>

      {/* Main Stream Core Feed: Accordions */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 animate-pulse text-sm">
            Loading Categories and Brands...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-700">No Categories Found</p>
            <p className="text-xs text-slate-400 mt-1">Add a new category to get started.</p>
          </div>
        ) : (
          categories.map((category, idx) => {
            const isOpen = expandedCategoryId === category.id;
            
          // Solid alternating color logic
          const isEven = idx % 2 === 0;
          const headerBg = isEven ? 'bg-slate-50/70 hover:bg-slate-100/80' : 'bg-indigo-50/40 hover:bg-indigo-100/50';
          const bodyBg = isEven ? 'bg-slate-50/30' : 'bg-indigo-50/20';
          const itemHoverBg = isEven ? 'hover:bg-slate-100/50' : 'hover:bg-indigo-100/50';
          const borderClass = isEven ? 'border-slate-200/60' : 'border-indigo-100/60';
          
          return (
            <div key={category.id} className={`rounded-xl border overflow-hidden shadow-3xs transition-all duration-200 ${borderClass}`}>
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${headerBg}`}
                >
                  <span className="text-sm font-bold text-slate-800 tracking-tight">{category.name}</span>
                  
                  <div className="flex items-center gap-x-3">
                    {/* Category Delete Button */}
                    <button 
                      type="button" 
                      onClick={(e) => handleDeleteCategory(e, category)}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-md transition-all duration-150"
                      title="Delete Category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    {/* Expand/Collapse Chevron */}
                    <svg className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* Accordion Body (Brands List) */}
                {isOpen && (
                  <div className={`border-t ${borderClass} divide-y ${isEven ? 'divide-slate-200/50' : 'divide-indigo-100/50'} flex flex-col ${bodyBg}`}>
                    {category.brands.length === 0 ? (
                      <p className="text-xs text-center text-slate-500 py-6 font-medium">No brands added to this category yet.</p>
                    ) : (
                      category.brands.map((brand) => (
                        <div key={brand.id} className={`px-4 py-3 flex items-center justify-between gap-x-4 transition-colors ${itemHoverBg}`}>
                          {/* Left: Name and Code */}
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-slate-800 tracking-tight">{brand.name}</h4>
                            <p className="text-[10px] font-mono text-slate-400 font-medium mt-0.5 tracking-widest">{brand.code}</p>
                          </div>
                          
                          {/* Right: Prices and Delete */}
                          <div className="flex items-center gap-x-4 shrink-0">
                            <div className="flex flex-col gap-y-1 text-right">
                              <div className="text-xs font-bold text-slate-700">
                                ₹{brand.wholesale.toFixed(2)} <span className="text-[9px] font-semibold text-slate-400 uppercase select-none">(W)</span>
                              </div>
                              <div className="text-[11px] font-bold text-slate-500">
                                ₹{brand.retail.toFixed(2)} <span className="text-[9px] font-semibold text-slate-400 uppercase select-none">(R)</span>
                              </div>
                            </div>
                            
                            {/* Brand Edit Button */}
                            <button 
                              type="button" 
                              onClick={(e) => handleEditBrandClick(e, category.id, brand)}
                              className="text-slate-300 hover:text-indigo-500 bg-white group-hover:bg-indigo-50 p-1.5 rounded-md transition-all duration-150 border border-transparent group-hover:border-indigo-100"
                              title="Edit Brand"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>

                            {/* Brand Delete Button */}
                            <button 
                              type="button" 
                              onClick={(e) => handleDeleteBrand(e, category.id, brand)}
                              className="text-slate-300 hover:text-rose-500 bg-white group-hover:bg-rose-50 p-1.5 rounded-md transition-all duration-150 border border-transparent group-hover:border-rose-100"
                              title="Delete Brand"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Add Brand Dashed Button */}
                    <div className="p-3 bg-white border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBrandCategoryId(category.id);
                          setEditingBrandId(null);
                          setNewBrandForm({ name: '', code: '', wholesale: '', retail: '' });
                        }}
                        className="w-full py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/50 text-slate-500 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-x-1.5 transition-all duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Add Brand</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* --- FLOATING ACTION BUTTON (FAB) FOR NEW CATEGORY --- */}
      <button
        type="button"
        onClick={() => setIsAddCategoryOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-fit max-w-[calc(100%-2rem)] md:absolute h-12 px-4 bg-indigo-950 hover:bg-indigo-900 active:bg-slate-900 text-white text-xs font-black tracking-wider uppercase rounded-full shadow-lg hover:shadow-xl transition-all duration-150 z-40 flex items-center justify-center gap-x-1.5 border border-indigo-900/40"
      >
        <span className="text-sm font-light leading-none">&#43;</span>
        <span>New Category</span>
      </button>

      {/* --- ADD CATEGORY POPUP MODAL --- */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200">
          <div className="w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">New Category</h3>
              </div>
              <button onClick={() => setIsAddCategoryOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-medium p-1 leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddCategorySubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category Name</label>
                <input
                  type="text" required placeholder="e.g., Value Segment" autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>
              <div className="flex items-center gap-x-2.5 pt-2">
                <button type="button" onClick={() => setIsAddCategoryOpen(false)} className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD BRAND POPUP MODAL --- */}
      {activeBrandCategoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {editingBrandId ? 'Edit Brand' : 'Register New Brand'}
                </h3>
              </div>
              <button onClick={handleCancelBrandForm} className="text-slate-400 hover:text-slate-600 text-lg font-medium p-1 leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleAddBrandSubmit} className="p-5 space-y-3.5">
              
              {/* Category (Locked / Disabled Field) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Category</label>
                <input
                  type="text"
                  disabled
                  value={categories.find(c => c.id === activeBrandCategoryId)?.name || ''}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-500 bg-slate-100/70 border border-slate-200/50 rounded-lg cursor-not-allowed select-none blur-[0.5px] opacity-80"
                />
              </div>

              {/* Brand Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Brand Name</label>
                <input
                  type="text" required placeholder="e.g., Classic Connect" autoFocus
                  value={newBrandForm.name}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* Brand Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Brand Code</label>
                <input
                  type="text" required placeholder="e.g., CLC-01"
                  value={newBrandForm.code}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, code: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Wholesale Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wholesale (₹)</label>
                  <input
                    type="number" step="any" required placeholder="0.00" min="0"
                    value={newBrandForm.wholesale}
                    onChange={(e) => setNewBrandForm({ ...newBrandForm, wholesale: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs text-right"
                  />
                </div>

                {/* Retail Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Retail (₹)</label>
                  <input
                    type="number" step="any" required placeholder="0.00" min="0"
                    value={newBrandForm.retail}
                    onChange={(e) => setNewBrandForm({ ...newBrandForm, retail: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-2xs text-right"
                  />
                </div>
              </div>

              <div className="flex items-center gap-x-2.5 pt-2">
                <button type="button" onClick={handleCancelBrandForm} className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs">
                  {editingBrandId ? 'Save Changes' : 'Add Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
