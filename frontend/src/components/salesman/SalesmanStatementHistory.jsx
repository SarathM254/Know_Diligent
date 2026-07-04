import React, { useState, useEffect } from 'react';
import { getSalesmanStatementHistory } from '../../api/userApi';

export default function SalesmanStatementHistory({ salesmanId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salesmanId) return;
    getSalesmanStatementHistory(salesmanId)
      .then(data => {
        setTransactions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load statement history:", err);
        setLoading(false);
      });
  }, [salesmanId]);

  // Helper mapping function to render minimal status metrics cleanly
  const getTransactionStyles = (type) => {
    switch (type) {
      case 'cash_payment_clearance':
      case 'manual_subtract':
        return {
          badgeText: "DEBT CLEARED",
          badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-100",
          amountPrefix: "-",
          amountClass: "text-emerald-600 font-bold"
        };
      case 'bill_delivery':
      case 'manual_add':
      default:
        return {
          badgeText: "DEBT ADDED",
          badgeClass: "bg-rose-50 text-rose-700 border border-rose-100",
          amountPrefix: "+",
          amountClass: "text-rose-600 font-bold"
        };
    }
  };

  return (
    <div className="w-full max-w-md pb-8 bg-slate-50">
      {/* Wrapper Layout Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        
        {/* Component Header Block */}
        <div className="flex items-center justify-between mb-4 p-3.5">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Transactions
            </h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                All Logs
            </span>
        </div>

        <div className="space-y-3.5">
          {loading ? (
            <div className="text-center text-slate-400 py-4 animate-pulse">Loading history...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-slate-400 py-4">No recent transactions found.</div>
          ) : (
            transactions.map((tx) => {
              const styles = getTransactionStyles(tx.type);
              // Format date nicely
              const dateObj = new Date(tx.createdAt || tx.date || Date.now());
              const day = String(dateObj.getDate()).padStart(2, '0');
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const year = dateObj.getFullYear();
              const dateStr = `${day}/${month}/${year}`;

              return (
                <div 
                  key={tx._id} 
                  className="group border border-slate-100 rounded-xl p-3.5 transition-colors duration-150 hover:bg-slate-50/60"
                >
                  {/* Meta Row Info */}
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-400 tracking-wide">
                      {dateStr}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${styles.badgeClass}`}>
                      {styles.badgeText}
                    </span>
                  </div>

                  {/* Primary Narrative Metric Line */}
                  <div className="flex items-start justify-between gap-4">
                    <p className="text font-medium text-slate-700 leading-tight">
                      {tx.description}
                    </p>
                    <span className={`text-base tracking-tight shrink-0 ${styles.amountClass}`}>
                      {styles.amountPrefix}₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Secondary Math Ledger Tracking */}
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Previous BF: ₹{tx.previousBF.toLocaleString('en-IN')}</span>
                    <span className="font-medium text-slate-500">
                      Closing BF: <span className="font-bold text-slate-700">₹{tx.newBF.toLocaleString('en-IN')}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}