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
  // FIX: Added utr to the interface so TypeScript knows it exists
  customer_info: { name: string; phone: string; address: string; pincode: string; utr?: string; };
}

export default function AdminDashboard() {
  const categories = ["microcontrollers", "components", "tools", "kits", "projects"];

  // 1. STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'orders'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usersData, setUsersData] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [form, setForm] = useState({ name: "", category: "microcontrollers", price: "", stock: "", image: "", desc: "", discount: "" });

  // 2. BULLETPROOF INITIALIZATION
  useEffect(() => {
    // Restore tab from localStorage
    const savedTab = localStorage.getItem('circuit_cart_admin_tab');
    if (savedTab === 'inventory' || savedTab === 'customers' || savedTab === 'orders') {
      setActiveTab(savedTab);
    }

    // Aggressive Fetch: Security Definer functions bypass the refresh race condition
    const loadData = async () => {
      await fetchInventory();
      await fetchCustomers();
      await fetchOrders();
    };
    loadData();

    // Auto-refresh every 30 seconds
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

  // --- DATA FETCHING ---
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

  // --- LOGISTICS ACTIONS ---
  const updateOrderStatus = async (orderId: string, newStatus: string, deliveryDate: string | null = null) => {
    // FIX: Prevents SQL crash if date is empty string
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("inventory").insert([{
      ...form, price: parseFloat(form.price), stock: parseInt(form.stock)
    }]);

    if (!error) {
      showToast("Inventory Updated", "success");
      setForm({ name: "", category: "microcontrollers", price: "", stock: "", image: "", desc: "", discount: "" });
      fetchInventory();
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!window.confirm("Scrap this component?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) {
      setInventory(inventory.filter((item) => item.id !== id));
      showToast("Component Scrapped", "success");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-8">
            Circuit Cart <span className="text-amber-500">Central Control</span>
          </h1>
          
          <div className="flex border-b border-slate-800 gap-4 md:gap-10 overflow-x-auto no-scrollbar">
            {['inventory', 'customers', 'orders'].map((tab) => (
              <button 
                key={tab}
                onClick={() => switchTab(tab as any)}
                className={`pb-4 px-4 font-bold text-sm md:text-base uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                {tab === 'orders' ? `Manifest Queue (${orders.filter(o => o.status === 'pending').length})` : tab}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="animate-pop-in space-y-10">
            <div className="bg-[#131921] p-6 md:p-10 rounded-2xl border border-slate-800 shadow-2xl">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3"><i className="fas fa-plus-circle text-amber-500"></i> Register Component</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none focus:border-amber-500 transition-colors" placeholder="Product Name" />
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none">
                  {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none" placeholder="Price (₹)" />
                   <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none" placeholder="Stock" />
                </div>
                <input type="text" value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none" placeholder="Image URL" />
                <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="md:col-span-2 p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none h-24" placeholder="Brief Description" />
                <button type="submit" className="md:col-span-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm active:scale-95">Push to Database</button>
              </form>
            </div>
            
            <div className="bg-[#131921] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
               <table className="w-full text-left">
                  <thead className="bg-[#232f3e] text-[11px] uppercase font-bold text-slate-400 tracking-widest">
                    <tr><th className="p-6">Component</th><th>Details</th><th className="text-right p-6">Management</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {inventory.map(item => (
                      <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-6 flex items-center gap-4"><img src={item.image} className="w-14 h-14 object-contain bg-white rounded-lg p-1" /><span className="font-bold text-base">{item.name}</span></td>
                        <td className="text-xs text-slate-400">Stock: <span className="text-white">{item.stock}</span> | ₹{item.price}</td>
                        <td className="p-6 text-right"><button onClick={() => handleDeleteInventory(item.id)} className="text-red-500 font-bold text-xs uppercase tracking-widest">Scrap</button></td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="animate-pop-in space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#131921] p-8 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-widest">Registered</h3>
                <p className="text-4xl font-black text-white">{usersData.length}</p>
              </div>
              <div className="bg-[#131921] p-8 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-widest">Active Carts</h3>
                <p className="text-4xl font-black text-amber-500">{usersData.filter(u => u.cart_data?.length > 0).length}</p>
              </div>
              <div className="bg-[#131921] p-8 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase mb-2 tracking-widest">Pot. Revenue</h3>
                <p className="text-4xl font-black text-green-500">₹{usersData.reduce((acc, u) => acc + u.cart_data?.reduce((s:number, i:any) => s + (i.product.price * i.qty), 0), 0)}</p>
              </div>
            </div>

            <div className="bg-[#131921] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
               <table className="w-full text-left">
                  <thead className="bg-[#232f3e] text-[11px] uppercase font-bold text-slate-400 tracking-widest">
                    <tr><th className="p-6">Operator</th><th>Payload</th><th className="text-right p-6">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersData.map(user => (
                      <tr key={user.user_id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-6"><b>{user.display_name}</b><br/><span className="text-xs text-slate-500">{user.email}</span></td>
                        <td><span className="bg-amber-500/10 text-amber-500 px-4 py-1 rounded-full text-xs font-bold">{user.cart_data?.length || 0} Items</span></td>
                        <td className="p-6 text-right"><button onClick={() => setSelectedUser(user)} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase">Inspect</button></td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="animate-pop-in space-y-6">
            {orders.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl opacity-20"><p className="text-xl font-bold uppercase tracking-widest">No Shipment Signals</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-[#131921] border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${order.status === 'pending' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                          {order.status}
                        </span>
                        <p className="text-xs font-mono text-slate-500">#{order.id.slice(0, 8)}</p>
                      </div>
                      <h3 className="font-black text-xl uppercase text-white">{order.customer_info.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">{order.customer_info.phone} • {order.customer_info.pincode}</p>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="text-center"><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Value</p><p className="text-2xl font-black text-amber-500">₹{order.total}</p></div>
                      <button onClick={() => setSelectedOrder(order)} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase shadow-lg active:scale-95 transition-all">Process</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: USER CART */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={() => setSelectedUser(null)}>
           <div className="bg-[#131921] w-full max-w-lg rounded-3xl p-8 border border-slate-800 shadow-2xl animate-pop-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-black uppercase">{selectedUser.display_name}'s Cart</h2>
                <button onClick={() => setSelectedUser(null)}><i className="fas fa-times text-slate-500 text-xl"></i></button>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scroll">
                 {selectedUser.cart_data.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 bg-[#020617] rounded-xl border border-slate-800 items-center">
                       <img src={item.product.image} className="w-12 h-12 object-contain bg-white p-1 rounded-lg" alt="" />
                       <div className="flex-1 font-bold text-sm">{item.product.name}</div>
                       <div className="text-amber-500 font-black">x{item.qty}</div>
                    </div>
                 ))}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-end">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
                 <span className="text-3xl font-black text-white">₹{selectedUser.cart_data.reduce((acc, i) => acc + (i.product.price * i.qty), 0)}</span>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: ORDER MANIFEST */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={() => setSelectedOrder(null)}>
          <div className="bg-[#131921] w-full max-w-2xl rounded-3xl p-8 md:p-10 border border-slate-800 shadow-2xl animate-pop-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8 border-b border-slate-800 pb-6">
              <div><h2 className="text-2xl font-black uppercase text-amber-500 tracking-tighter">Manifest</h2><p className="text-xs font-mono text-slate-500 mt-1">ID: {selectedOrder.id}</p></div>
              <button onClick={() => setSelectedOrder(null)}><i className="fas fa-times text-2xl text-slate-500"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-10 custom-scroll">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#020617] p-8 rounded-2xl border border-slate-800">
                <div><p className="text-xs font-bold text-slate-500 uppercase mb-2">Target</p><p className="font-bold text-base">{selectedOrder.customer_info.name}</p></div>
                <div><p className="text-xs font-bold text-slate-500 uppercase mb-2">Signal</p><p className="font-bold text-base">{selectedOrder.customer_info.phone}</p></div>
                <div className="col-span-1 md:col-span-2"><p className="text-xs font-bold text-slate-500 uppercase mb-2">Coordinate</p><p className="font-bold text-base leading-relaxed">{selectedOrder.customer_info.address}</p></div>
                
                {/* FIX: THIS DISPLAYS THE UTR FROM THE CUSTOMER! */}
                <div className="col-span-1 md:col-span-2 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                  <p className="text-xs font-black text-amber-500 uppercase mb-1 tracking-widest">Transaction UTR</p>
                  <p className="font-mono text-lg text-white tracking-widest">{selectedOrder.customer_info.utr || 'NOT PROVIDED'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Payload</h3>
                {selectedOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-6 bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                    <img src={item.product.image} className="w-16 h-16 object-contain bg-white rounded-xl p-2" alt="" />
                    <div className="flex-1"><p className="font-bold text-base text-white">{item.product.name}</p><p className="text-sm font-bold text-amber-500 mt-1">Quantity: {item.qty}</p></div>
                  </div>
                ))}
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-3xl space-y-8">
                <h3 className="text-sm font-black uppercase text-amber-500 tracking-widest text-center">Status Control</h3>
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-slate-500 text-center block">ETA Arrival</label>
                  <input type="date" id="del_date" className="w-full p-4 bg-[#020617] border border-slate-700 rounded-xl outline-none focus:border-amber-500 font-bold text-center" defaultValue={selectedOrder.delivery_date ? selectedOrder.delivery_date.split('T')[0] : ''} />
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => { const d = (document.getElementById('del_date') as HTMLInputElement).value; updateOrderStatus(selectedOrder.id, 'confirmed', d); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg transition-transform active:scale-95">Confirm & Validate</button>
                  <div className="flex gap-3">
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase">Mark Shipped</button>
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase">Mark Arrived</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-10 right-10 z-[200] px-8 py-4 rounded-2xl shadow-2xl ${toast.type === 'success' ? 'bg-amber-500 text-slate-900' : 'bg-red-600 text-white'} font-bold animate-pop-in text-sm flex items-center gap-3`}>
          <i className="fas fa-check-circle text-xl"></i> {toast.msg}
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        @keyframes popIn { from { opacity: 0; transform: scale(0.97) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}