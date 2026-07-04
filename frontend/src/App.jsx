import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import apiClient from './api/apiClient';

// Owner Components
import OwnerDashboard from './components/owner/dashboard/OwnerDashboard';
import VerificationDesk from './components/owner/verification/VerificationDesk';
import LedgerControlPortal from './components/owner/ledger/LedgerControlPortal';
import OwnerSalesmanHistory from './components/owner/ledger/OwnerSalesmanHistory';
import StaffManagementPortal from './components/owner/staff/StaffManagementPortal';
import InventoryControlPortal from './components/owner/inventory/InventoryControlPortal';
import BrandManagerPortal from './components/owner/brand/BrandManagerPortal';
import UpiTallyDesk from './components/owner/UpiTallyDesk';
import OwnerBillCalculator from './components/owner/calculator/OwnerBillCalculator';

// Operator Components
import OperatorDashboard from './components/operator/OperatorDashboard';
import OperatorSelectionList from './components/operator/OperatorSelectionList';

// Salesman Components
import CashPaymentSettlement from './components/salesman/CashPaymentSettlement';
import SalesmanProfileCard from './components/salesman/SalesmanProfileCard';
import SalesmanStatementHistory from './components/salesman/SalesmanStatementHistory';
import SalesmanBillingScreen from './components/salesman/SalesmanBillingScreen';
import SalesmanSelectionList from './components/salesman/SalesmanSelectionList';
import SalesmanPriceList from './components/salesman/SalesmanPriceList';
import UpiPaymentEntry from './components/salesman/UpiPaymentEntry';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState(() => {
    return localStorage.getItem('session_role') || 'none';
  });

  // operator state
  const [activeOperator, setActiveOperator] = useState(() => {
    const userJson = localStorage.getItem('session_user');
    const storedRole = localStorage.getItem('session_role');
    return (userJson && storedRole === 'operator') ? JSON.parse(userJson) : null;
  });

  // salesman state
  const [activeSalesman, setActiveSalesman] = useState(() => {
    const userJson = localStorage.getItem('session_user');
    const storedRole = localStorage.getItem('session_role');
    if (userJson && storedRole === 'salesman') {
      const u = JSON.parse(userJson);
      return {
        ...u,
        code: u.salesmanId || 'N/A',
        bf: u.broughtForwardDebt || 0
      };
    }
    return null;
  });

  // error message state
  const [errorMsg, setErrorMsg] = useState('');

  // pin verification state
  const [isOwnerPinVerified, setIsOwnerPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('session_role');
    localStorage.removeItem('session_user');
    setRole('none');
    setActiveSalesman(null);
    setActiveOperator(null);
    setErrorMsg('');
    setIsOwnerPinVerified(false);
    setPinInput('');
    setPinError('');
    navigate('/');
  };

  const handleDemoLogin = async (targetRole, user = null) => {
    try {
      const res = await apiClient.post('/auth/demo-login', {
        role: targetRole,
        userId: user ? user._id : undefined
      });
      
      const { token } = res.data;
      localStorage.setItem('session_token', token);
      localStorage.setItem('session_role', targetRole);
      if (user) {
        localStorage.setItem('session_user', JSON.stringify(user));
      }
      
      setRole(targetRole);
      
      if (targetRole === 'salesman' && user) {
        setActiveSalesman({
          ...user,
          code: user.salesmanId || 'N/A',
          bf: user.broughtForwardDebt || 0
        });
        navigate('/salesman');
      } else if (targetRole === 'operator' && user) {
        setActiveOperator(user);
        navigate('/operator');
      } else if (targetRole === 'owner') {
        navigate('/owner');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Login failed');
    }
  };

  const handleBackToList = (type) => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('session_user');
    setActiveSalesman(null);
    setActiveOperator(null);
    setRole(type === 'salesman' ? 'salesman_selection' : 'operator_selection');
    navigate('/');
  };

  if (role === 'none') {
    return (
      <div className="w-full max-w-md mx-auto p-4 min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full flex flex-col gap-6 text-center">
          <h1 className="text-3xl font-extrabold text-blue-600 mb-2">Manikyapriya Agencies</h1>
          <p className="text-gray-500 mb-6">Select your portal to continue (Demo Mode)</p>
          
          <button 
            onClick={() => handleDemoLogin('owner')}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            Enter Owner Portal
          </button>
          
          <button 
             onClick={() => setRole('operator_selection')}
            className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            Enter Operator Portal
          </button>
          
          <button 
            onClick={() => setRole('salesman_selection')}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            Enter Salesman Portal
          </button>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-100 leading-normal">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (role === 'operator_selection') {
    return (
      <div className="w-full max-w-md mx-auto p-4 min-h-screen bg-gray-50 flex flex-col font-sans">
        <header className="flex items-center justify-between bg-white shadow-md rounded-xl p-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 capitalize">Operator Portal</h2>
            <p className="text-xs text-gray-500 font-medium">Select Profile</p>
          </div>
          <button onClick={() => setRole('none')} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors">Back</button>
        </header>
        <OperatorSelectionList onSelectOperator={(op) => handleDemoLogin('operator', op)} />
      </div>
    );
  }

  if (role === 'salesman_selection') {
    return (
      <div className="w-full max-w-md mx-auto p-4 min-h-screen bg-gray-50 flex flex-col font-sans">
        <header className="flex items-center justify-between bg-white shadow-md rounded-xl p-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 capitalize">Salesman Portal</h2>
            <p className="text-xs text-gray-500 font-medium">Select Profile</p>
          </div>
          <button onClick={() => setRole('none')} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors">Back</button>
        </header>
        <SalesmanSelectionList onSelectSalesman={(s) => handleDemoLogin('salesman', s)} />
      </div>
    );
  }

  // Common Header for authenticated state
  const Header = () => (
    <header className="flex items-center justify-between bg-white shadow-md rounded-xl p-4 mb-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800 capitalize">{role} Portal</h2>
        <p className="text-xs text-gray-500 font-medium">Manikyapriya Agencies</p>
      </div>
      <button 
        onClick={handleLogout}
        className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors shadow-sm"
      >
        Switch Role / Logout
      </button>
    </header>
  );

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setVerifyingPin(true);
    setPinError('');
    try {
      await apiClient.post('/auth/verify-owner', { pin: pinInput });
      setIsOwnerPinVerified(true);
    } catch (err) {
      setPinError(err.response?.data?.error || 'Invalid PIN');
    } finally {
      setVerifyingPin(false);
    }
  };

  const isDesktopView = location.pathname === '/owner/upi';
  const containerMaxWidth = isDesktopView ? 'max-w-full' : 'max-w-md';

  return (
    <div className={`w-full mx-auto p-0 min-h-screen bg-gray-50 flex flex-col font-sans ${containerMaxWidth}`}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <Header />
      
      {role === 'salesman' ? (
        <main className="flex-1 w-full pb-4 flex flex-col gap-4">
          <Routes>
            <Route path="/salesman" element={
              !activeSalesman ? (
                <div className="p-4 text-center text-slate-500">Please login again</div>
              ) : (
                <>
                  <SalesmanProfileCard salesman={activeSalesman} onBackToList={() => handleBackToList('salesman')} />
                  <SalesmanStatementHistory salesmanId={activeSalesman._id} />
                </>
              )
            } />
            {activeSalesman && (
              <>
                <Route path="/salesman/billing" element={<SalesmanBillingScreen salesman={activeSalesman} />} />
                <Route path="/salesman/cash" element={<CashPaymentSettlement salesman={activeSalesman} />} />
                <Route path="/salesman/prices" element={<SalesmanPriceList />} />
                <Route path="/salesman/upi" element={<UpiPaymentEntry salesman={activeSalesman} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/salesman" replace />} />
          </Routes>
        </main>
      ) : role === 'owner' ? (
        <main className="flex-1 w-full pb-4">
            <Routes>
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/verify" element={<VerificationDesk />} />
              <Route path="/owner/ledger" element={<LedgerControlPortal />} />
              <Route path="/owner/ledger/history/:salesmanId" element={<OwnerSalesmanHistory />} />
              <Route path="/owner/staff" element={<StaffManagementPortal />} />
              <Route path="/owner/inventory" element={<InventoryControlPortal />} />
              <Route path="/owner/brands" element={<BrandManagerPortal />} />
              <Route path="/owner/billing_ops" element={<OperatorDashboard />} />
              <Route path="/owner/calculator" element={<OwnerBillCalculator />} />
              <Route path="/owner/upi" element={<UpiTallyDesk />} />
              <Route path="*" element={<Navigate to="/owner" replace />} />
            </Routes>
        </main>
      ) : role === 'operator' ? (
        <main className="flex-1 w-full pb-4">
          <Routes>
            <Route path="/operator" element={
              !activeOperator ? (
                <div className="p-4 text-center text-slate-500">Please login again</div>
              ) : (
                <OperatorDashboard onBackToList={() => handleBackToList('operator')} />
              )
            } />
            <Route path="*" element={<Navigate to="/operator" replace />} />
          </Routes>
        </main>
      ) : null}
    </div>
  );
}