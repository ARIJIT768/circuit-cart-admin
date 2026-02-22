"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface InventoryItem {
  id: string; name: string; category: string; price: number;
  stock: number; image: string; desc: string; discount: string;
}

interface UserData {
  user_id: string; email: string; display_name: string;
  cart_data: any[]; updated_at: string;
}

interface OrderRequest {
  id: string; user_id: string; total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  delivery_date: string | null; created_at: string; items: any[];
  customer_info: { 
    name: string; phone: string; address: string; pincode: string; 
    utr?: string; receipt_url?: string; // 🆕 Added visual verification field
  };
}

export default function AdminDashboard() {
  const categories = ["microcontrollers", "components", "tools", "kits", "projects"];
  const FALLBACK_IMG = "https://placehold.co/150x150/1e293b/fbbf24?text=No+Img"; 

  const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'orders'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usersData, setUsersData] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [form, setForm] = useState({ name: "", category: "microcontrollers", price: "", stock: "", image: "", desc: "", discount: "" });

  useEffect(() => {
    const savedTab = localStorage.getItem('circuit_cart_admin_tab');
    if (savedTab === 'inventory' || savedTab === 'customers' || savedTab === 'orders') {
      setActiveTab(savedTab);
    }

    const loadData = async () => {
      await fetchInventory();
      await fetchCustomers();
      await fetchOrders();
    };
    loadData();

    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const switchTab = (tab: 'inventory' | 'customers' | 'orders') => {
    setActiveTab(tab);
    localStorage.setItem('circuit_cart_admin_tab', tab);
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function fetchInventory() {
    const { data } = await supabase.from("inventory").select("*").order("created_at", { ascending: false });
    if (data) setInventory(data);
    setLoading(false);
  }

  async function fetchCustomers() {
    const { data } = await supabase.rpc('get_all_users_and_carts');
    if (data) setUsersData(data);
  }

  async function fetchOrders() {
    const { data } = await supabase.rpc('get_all_orders');
    if (data) setOrders(data as OrderRequest[]);
  }

  const handleRejectOrder = async (orderId: string) => {
    if (!window.confirm("ARE YOU SURE? This will permanently delete the order from the database.")) return;
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (!error) {
      showToast("Order Purged", "success");
      setOrders(orders.filter(o => o.id !== orderId));
      setSelectedOrder(null);
    } else {
      showToast("Purge Failed", "error");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, deliveryDate: string | null = null) => {
    const safeDate = deliveryDate && deliveryDate.trim() !== "" ? deliveryDate : null;
    const { error } = await supabase.rpc('update_order_status', {
      target_id: orderId,
      new_status: newStatus,
      new_date: safeDate
    });
    if (!error) {
      showToast(`Signal: ${newStatus}`, "success");
      fetchOrders();
      setSelectedOrder(null);
    } else {
      showToast("Update Failed", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase mb-6 md:mb-8 text-center md:text-left">
            Circuit Cart <span className="text-amber-500 block md:inline mt-1 md:mt-0">Central Control</span>
          </h1>
          
          <div className="flex border-b border-slate-800 gap-4 md:gap-10 overflow-x-auto custom-scroll pb-1">
            {['inventory', 'customers', 'orders'].map((tab) => (
              <button 
                key={tab}
                onClick={() => switchTab(tab as any)}
                className={`pb-3 md:pb-4 px-2 md:px-4 font-bold text-xs md:text-base uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                {tab === 'orders' ? `Manifest Queue (${orders.filter(o => o.status === 'pending').length})` : tab}
              </button>
            ))}
          </div>
        </div>

        {/* ... Inventory and Customer rendering ... */}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="animate-pop-in space-y-4 md:space-y-6">
            {orders.length === 0 ? (
              <div className="py-20 md:py-24 text-center border-2 border-dashed border-slate-800 rounded-2xl md:rounded-3xl opacity-20"><p className="text-lg md:text-xl font-bold uppercase tracking-widest">No Shipment Signals</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-[#131921] border border-slate-800 rounded-2xl p-5 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 md:gap-8 shadow-xl">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                        <span className={`px-3 py-1 md:px-4 md:py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest ${order.status === 'pending' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                          {order.status}
                        </span>
                        <p className="text-[10px] md:text-xs font-mono text-slate-500">#{order.id.slice(0, 8)}</p>
                      </div>
                      <h3 className="font-black text-lg md:text-xl uppercase text-white truncate">{order.customer_info.name}</h3>
                      <p className="text-xs md:text-sm text-slate-400 mt-1">{order.customer_info.phone} • {order.customer_info.pincode}</p>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col md:flex-row items-center justify-between w-full sm:w-auto gap-4 md:gap-10 border-t border-slate-800 sm:border-none pt-4 sm:pt-0">
                      <div className="text-left sm:text-center">
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-0 md:mb-1">Value</p>
                        <p className="text-xl md:text-2xl font-black text-amber-500">₹{order.total}</p>
                      </div>
                      <button onClick={() => setSelectedOrder(order)} className="px-6 py-3 md:px-8 md:py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all whitespace-nowrap">Process</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ORDER MANIFEST */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90" onClick={() => setSelectedOrder(null)}>
          <div className="bg-[#131921] w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl p-6 md:p-10 border-t md:border border-slate-800 shadow-2xl animate-pop-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6 md:mb-8 border-b border-slate-800 pb-4 md:pb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase text-amber-500 tracking-tighter">Manifest</h2>
                <p className="text-[10px] md:text-xs font-mono text-slate-500 mt-1">ID: {selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2"><i className="fas fa-times text-xl md:text-2xl text-slate-500"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-8 md:space-y-10 custom-scroll pb-6 md:pb-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-8 bg-[#020617] p-5 md:p-8 rounded-2xl border border-slate-800">
                <div><p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 md:mb-2">Target</p><p className="font-bold text-sm md:text-base">{selectedOrder.customer_info.name}</p></div>
                <div><p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 md:mb-2">Signal</p><p className="font-bold text-sm md:text-base">{selectedOrder.customer_info.phone}</p></div>
                <div className="col-span-1 sm:col-span-2"><p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 md:mb-2">Coordinate</p><p className="font-bold text-sm md:text-base leading-relaxed">{selectedOrder.customer_info.address}</p></div>
                
                {/* 🆕 RECEIPT VALIDATION HUB */}
                <div className="col-span-1 sm:col-span-2 bg-amber-500/5 p-5 md:p-8 rounded-2xl border border-amber-500/20">
                  <p className="text-[10px] md:text-xs font-black text-amber-500 uppercase mb-4 tracking-widest text-center">Receipt Verification</p>
                  
                  {selectedOrder.customer_info.receipt_url ? (
                    <div className="space-y-4">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black group">
                        <img 
                          src={selectedOrder.customer_info.receipt_url} 
                          className="w-full h-full object-contain" 
                          alt="Payment Receipt"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <a href={selectedOrder.customer_info.receipt_url} target="_blank" className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl">Open Full Resolution</a>
                        </div>
                      </div>
                      <div className="bg-[#020617] p-3 rounded-lg border border-slate-800 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Stated UTR</p>
                        <p className="font-mono text-sm text-white tracking-widest">{selectedOrder.customer_info.utr}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-500 font-bold uppercase text-[10px]">Manual Entry (No Photo Provided)</p>
                      <p className="font-mono text-lg text-white mt-2 tracking-widest">{selectedOrder.customer_info.utr || 'NOT PROVIDED'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ... Payload and Status Control rendering ... */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-[10px] md:text-xs font-bold uppercase text-slate-500 tracking-widest">Payload</h3>
                {selectedOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 md:gap-6 bg-slate-900/50 p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-800">
                    <img src={item.product?.image || FALLBACK_IMG} className="w-12 h-12 md:w-16 md:h-16 object-contain bg-white rounded-lg md:rounded-xl p-1 md:p-2" alt="" />
                    <div className="flex-1"><p className="font-bold text-sm md:text-base text-white line-clamp-2">{item.product?.name || "Unknown Item"}</p><p className="text-xs md:text-sm font-bold text-amber-500 mt-1">Quantity: {item.qty}</p></div>
                  </div>
                ))}
              </div>
              
              <div className="bg-amber-500/5 border border-amber-500/20 p-5 md:p-8 rounded-2xl md:rounded-3xl space-y-6 md:space-y-8">
                <h3 className="text-xs md:text-sm font-black uppercase text-amber-500 tracking-widest text-center">Status Control</h3>
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] md:text-xs font-bold uppercase text-slate-500 text-center block">ETA Arrival</label>
                  <input type="date" id="del_date" className="w-full p-3 md:p-4 bg-[#020617] border border-slate-700 rounded-xl outline-none focus:border-amber-500 font-bold text-center text-sm" defaultValue={selectedOrder.delivery_date ? selectedOrder.delivery_date.split('T')[0] : ''} />
                </div>
                
                <div className="flex flex-col gap-3">
                  <button onClick={() => { const d = (document.getElementById('del_date') as HTMLInputElement).value; updateOrderStatus(selectedOrder.id, 'confirmed', d); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg transition-transform active:scale-95">Confirm & Validate</button>
                  <div className="flex gap-3">
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider">Shipped</button>
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-wider">Delivered</button>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => handleRejectOrder(selectedOrder.id)} className="w-full bg-transparent hover:bg-red-500/10 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all">Reject & Purge Signal</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ... Toast and Styles ... */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 md:bottom-10 md:left-auto md:right-10 md:translate-x-0 w-[90vw] md:w-auto max-w-sm z-[200] px-6 py-4 rounded-2xl shadow-2xl ${toast.type === 'success' ? 'bg-amber-500 text-slate-900' : 'bg-red-600 text-white'} font-bold animate-pop-in text-xs md:text-sm flex items-center justify-center md:justify-start gap-3`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} text-lg md:text-xl`}></i> {toast.msg}
        </div>
      )}
      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        @keyframes popIn { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}