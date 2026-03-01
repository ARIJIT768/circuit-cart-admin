'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
// 🔥 Firebase Imports
import { db, auth } from "../utils/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

interface InventoryItem {
  id: string | number; name: string; category: string; price: number;
  stock: number; image: string; desc: string; discount: string | null;
}

interface UserData {
  user_id: string; email: string; display_name: string;
  cart_data: any[]; updated_at: string;
}

interface OrderRequest {
  id: string; user_id: string; total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'rejected';
  delivery_date: string | null; created_at: string; items: any[];
  customer_info: { 
    name: string; phone: string; address: string; pincode: string; 
    utr?: string; receipt_url?: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const categories = ["microcontrollers", "components", "tools", "kits", "projects"];
  const FALLBACK_IMG = "https://placehold.co/150x150/1e293b/fbbf24?text=No+Img"; 

  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'customers' | 'orders'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usersData, setUsersData] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [form, setForm] = useState({ name: "", category: "microcontrollers", price: "", stock: "", image: "", desc: "", discount: "" });
  
  // 🔥 ImgBB Image Upload State
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1. SECURITY LOCK & DATA INIT
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // 🛡️ ONLY THIS EMAIL CAN ACCESS THE DASHBOARD
      if (user && user.email === 'circuitcart2025@gmail.com') {
        setIsAdmin(true);
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

        // Refresh data every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const switchTab = (tab: 'inventory' | 'customers' | 'orders') => {
    setActiveTab(tab);
    localStorage.setItem('circuit_cart_admin_tab', tab);
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 2. FIREBASE QUERIES
  async function fetchInventory() {
    const querySnapshot = await getDocs(collection(db, 'inventory'));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
    setInventory(data);
    setLoading(false);
  }

  async function fetchCustomers() {
    const profilesSnap = await getDocs(collection(db, 'profiles'));
    const cartsSnap = await getDocs(collection(db, 'user_carts'));
    
    const cartsMap: any = {};
    cartsSnap.forEach(doc => { cartsMap[doc.id] = doc.data().cart_data || []; });

    const mergedUsers = profilesSnap.docs.map(doc => {
      const d = doc.data();
      return {
        user_id: d.id,
        email: d.email,
        display_name: d.display_name,
        cart_data: cartsMap[d.id] || [],
        updated_at: d.created_at
      } as UserData;
    });
    setUsersData(mergedUsers);
  }

  async function fetchOrders() {
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderRequest));
    setOrders(data);
  }

  // 3. MUTATION ACTIONS & AUTO-UPLOAD
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    const newId = Date.now().toString(); 
    
    try {
      let finalImageUrl = form.image;

      // 🔥 AUTO-UPLOAD TO IMGBB
      if (productImageFile) {
        const imgFormData = new FormData();
        imgFormData.append('image', productImageFile);
        
        const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`, {
          method: 'POST',
          body: imgFormData
        });
        
        const imgData = await imgRes.json();
        if (imgData.success) {
          finalImageUrl = imgData.data.url;
        } else {
          showToast("Failed to upload image to ImgBB", "error");
        }
      }

      await setDoc(doc(db, 'inventory', newId), {
        id: parseInt(newId),
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        image: finalImageUrl || "",
        desc: form.desc,
        details: form.desc,
        discount: form.discount || null,
        rating: 0,
        created_at: new Date().toISOString()
      });

      showToast("Inventory Updated", "success");
      setForm({ name: "", category: "microcontrollers", price: "", stock: "", image: "", desc: "", discount: "" });
      setProductImageFile(null);
      fetchInventory();
    } catch (error) {
      showToast("Failed to add product", "error");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDeleteInventory = async (id: string | number) => {
    if (!window.confirm("Scrap this component?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id.toString()));
      setInventory(inventory.filter((item) => item.id.toString() !== id.toString()));
      showToast("Component Scrapped", "success");
    } catch (error) {
      showToast("Failed to scrap", "error");
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!window.confirm("Mark this order as REJECTED? User will see a Red Progress Bar.")) return;
    await updateOrderStatus(orderId, 'rejected');
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, deliveryDate: string | null = null) => {
    const safeDate = deliveryDate && deliveryDate.trim() !== "" ? deliveryDate : null;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: any = { status: newStatus };
      if (safeDate) updateData.delivery_date = safeDate;

      await updateDoc(orderRef, updateData);
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any, delivery_date: safeDate } : o));
      showToast(`Signal: ${newStatus}`, "success");
      setSelectedOrder(null);
    } catch (error) {
      console.error(error);
      showToast("Update Failed", "error");
    }
  };

  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      showToast("Authentication Failed", "error");
    }
  };

  // 🔥 ADMIN LOGIN SCREEN
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans selection:bg-amber-500/30 p-4 text-center">
        <i className="fas fa-shield-alt text-6xl text-amber-500 mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"></i>
        <h1 className="text-3xl font-black uppercase text-white tracking-tight mb-2">Central Control</h1>
        <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-8">Restricted Access. Level 5 Clearance Required.</p>
        
        <button 
          onClick={handleAdminLogin}
          className="bg-[#131921] border border-slate-700 hover:border-amber-500 text-white font-bold py-4 px-8 rounded-xl flex items-center gap-4 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span className="text-xs uppercase tracking-widest">Verify Admin Credentials</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-10 font-sans pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8 md:mb-12">
          <div className="flex justify-between items-end mb-6">
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-center md:text-left">
              Circuit Cart <span className="text-amber-500 block md:inline mt-1 md:mt-0">Central Control</span>
            </h1>
            <button onClick={() => auth.signOut()} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-red-500 transition-colors">
              <i className="fas fa-sign-out-alt mr-2"></i> Lock Vault
            </button>
          </div>
          
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

        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="animate-pop-in space-y-8 md:space-y-10">
            <div className="bg-[#131921] p-5 md:p-10 rounded-2xl border border-slate-800 shadow-2xl">
              <h2 className="text-lg md:text-xl font-bold mb-6 md:mb-8 flex items-center gap-3"><i className="fas fa-plus-circle text-amber-500"></i> Register Component</h2>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none focus:border-amber-500 text-sm" placeholder="Product Name" />
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none text-sm font-bold uppercase">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none text-sm" placeholder="Price (₹)" />
                   <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none text-sm" placeholder="Stock" />
                </div>
                
                {/* 🔥 NEW AUTO UPLOAD UI */}
                <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-4">
                  <label className="flex-1 w-full border-2 border-dashed border-slate-700 hover:border-amber-500 hover:bg-amber-500/5 p-4 rounded-xl cursor-pointer text-center transition-all group">
                    <i className={`fas ${productImageFile ? 'fa-check-circle text-green-500' : 'fa-cloud-upload-alt text-slate-500 group-hover:text-amber-500'} text-2xl mb-2`}></i>
                    <span className={`block text-xs font-bold uppercase tracking-widest ${productImageFile ? 'text-white' : 'text-slate-400'}`}>
                      {productImageFile ? productImageFile.name : 'Upload Component Photo'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setProductImageFile(e.target.files ? e.target.files[0] : null)} />
                  </label>
                  <span className="font-black text-slate-600 uppercase text-[10px]">OR</span>
                  <input type="text" value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="flex-1 w-full p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none text-sm focus:border-amber-500 transition-colors" placeholder="Paste Image URL Directly" />
                </div>

                <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} className="md:col-span-2 p-4 rounded-xl bg-[#020617] border border-slate-700 outline-none h-24 text-sm resize-none" placeholder="Description" />
                
                <button type="submit" disabled={isUploading} className="md:col-span-2 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-slate-900 font-black py-4 rounded-xl uppercase tracking-widest text-xs transition-transform active:scale-95 flex items-center justify-center gap-2">
                  {isUploading ? <><i className="fas fa-circle-notch fa-spin"></i> Uploading...</> : 'Push to Database'}
                </button>
              </form>
            </div>
            
            <div className="bg-[#131921] rounded-2xl border border-slate-800 overflow-hidden">
               <div className="overflow-x-auto custom-scroll">
                 <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-[#232f3e] text-[10px] uppercase font-bold text-slate-400">
                      <tr><th className="p-6">Component</th><th className="p-6">Details</th><th className="text-right p-6">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {inventory.map(item => (
                        <tr key={item.id} className="hover:bg-slate-900/50">
                          <td className="p-6 flex items-center gap-4">
                            <img src={item.image || FALLBACK_IMG} className="w-12 h-12 object-contain bg-white rounded-lg p-1" />
                            <span className="font-bold text-sm">{item.name}</span>
                          </td>
                          <td className="p-6 text-xs text-slate-400">Stock: <span className="text-white font-bold">{item.stock}</span> | ₹{item.price}</td>
                          <td className="p-6 text-right"><button onClick={() => handleDeleteInventory(item.id)} className="text-red-500 font-bold text-[10px] uppercase bg-red-500/10 hover:bg-red-500 hover:text-white transition-colors px-3 py-2 rounded-lg">Scrap</button></td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="animate-pop-in space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-[#131921] p-8 rounded-2xl border border-slate-800"><h3 className="text-slate-500 text-[10px] font-bold uppercase mb-2">Users</h3><p className="text-4xl font-black">{usersData.length}</p></div>
              <div className="bg-[#131921] p-8 rounded-2xl border border-slate-800"><h3 className="text-slate-500 text-[10px] font-bold uppercase mb-2">Active Carts</h3><p className="text-4xl font-black text-amber-500">{usersData.filter(u => u.cart_data?.length > 0).length}</p></div>
              <div className="bg-[#131921] p-8 rounded-2xl border border-slate-800"><h3 className="text-slate-500 text-[10px] font-bold uppercase mb-2">Potential Rev.</h3><p className="text-4xl font-black text-green-500">₹{usersData.reduce((acc, u) => acc + u.cart_data?.reduce((s:number, i:any) => s + (i.product.price * i.qty), 0), 0)}</p></div>
            </div>

            <div className="bg-[#131921] rounded-2xl border border-slate-800 overflow-hidden">
               <div className="overflow-x-auto custom-scroll">
                 <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-[#232f3e] text-[10px] uppercase font-bold text-slate-400">
                      <tr><th className="p-6">Operator</th><th className="p-6">Payload</th><th className="text-right p-6">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {usersData.map(user => (
                        <tr key={user.user_id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-6">
                            <b className="text-sm">{user.display_name}</b><br/>
                            <span className="text-[10px] text-slate-500">{user.email}</span>
                          </td>
                          <td className="p-6"><span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-bold">{user.cart_data?.length || 0} Items</span></td>
                          <td className="p-6 text-right"><button onClick={() => setSelectedUser(user)} className="bg-slate-800 hover:bg-slate-700 transition-colors text-white px-5 py-2 rounded-lg font-bold text-[10px] uppercase">Inspect</button></td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="animate-pop-in space-y-4 md:space-y-6">
            {orders.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl opacity-20"><p className="text-xl font-bold uppercase tracking-widest">No Shipment Signals</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-[#131921] border border-slate-800 rounded-2xl p-8 flex flex-col sm:flex-row justify-between items-center gap-8 shadow-xl hover:border-amber-500/30 transition-colors">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                          order.status === 'rejected' ? 'bg-red-600/20 text-red-500' : 
                          order.status === 'shipped' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-green-500/10 text-green-500'
                        }`}>
                          {order.status}
                        </span>
                        <p className="text-[10px] font-mono text-slate-500">#{order.id.slice(0, 8)}</p>
                      </div>
                      <h3 className="font-black text-xl uppercase text-white truncate">{order.customer_info?.name || 'Unknown Operator'}</h3>
                      <p className="text-sm text-slate-400 mt-1">{order.customer_info?.phone} • {order.customer_info?.pincode}</p>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Value</p>
                        <p className="text-2xl font-black text-amber-500">₹{order.total}</p>
                      </div>
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
           <div className="bg-[#131921] w-full max-w-lg rounded-3xl p-8 border border-slate-800 animate-pop-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-black uppercase truncate">{selectedUser.display_name}'s Cart</h2>
                <button onClick={() => setSelectedUser(null)}><i className="fas fa-times text-slate-500 hover:text-amber-500 transition-colors text-xl"></i></button>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1 custom-scroll">
                 {selectedUser.cart_data.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 bg-[#020617] rounded-xl border border-slate-800 items-center">
                       <img src={item.product?.image || FALLBACK_IMG} className="w-12 h-12 object-contain bg-white p-1 rounded-lg" />
                       <div className="flex-1 font-bold text-sm line-clamp-2">{item.product?.name}</div>
                       <div className="text-amber-500 font-black text-base">x{item.qty}</div>
                    </div>
                 ))}
              </div>
              <div className="mt-6 pt-5 border-t border-slate-800 flex justify-between items-end">
                 <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
                 <span className="text-3xl font-black text-white">₹{selectedUser.cart_data.reduce((acc, i) => acc + (i.product.price * i.qty), 0)}</span>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: ORDER MANIFEST */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={() => setSelectedOrder(null)}>
          <div className="bg-[#131921] w-full max-w-2xl rounded-3xl p-10 border border-slate-800 animate-pop-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8 border-b border-slate-800 pb-6">
              <div><h2 className="text-2xl font-black uppercase text-amber-500">Manifest</h2><p className="text-[10px] font-mono text-slate-500">ID: {selectedOrder.id}</p></div>
              <button onClick={() => setSelectedOrder(null)}><i className="fas fa-times text-2xl text-slate-500 hover:text-amber-500 transition-colors"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-10 custom-scroll pr-2">
              <div className="grid grid-cols-2 gap-8 bg-[#020617] p-8 rounded-2xl border border-slate-800">
                <div><p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Target</p><p className="font-bold">{selectedOrder.customer_info?.name}</p></div>
                <div><p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Signal</p><p className="font-bold">{selectedOrder.customer_info?.phone}</p></div>
                <div className="col-span-2"><p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Coordinate</p><p className="font-bold leading-relaxed">{selectedOrder.customer_info?.address}</p></div>
                
                <div className="col-span-2 bg-amber-500/5 p-8 rounded-2xl border border-amber-500/20">
                  <p className="text-[10px] font-black text-amber-500 uppercase mb-4 tracking-widest text-center">Receipt Verification</p>
                  {selectedOrder.customer_info?.receipt_url ? (
                    <div className="space-y-4">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black group">
                        <img src={selectedOrder.customer_info.receipt_url} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <a href={selectedOrder.customer_info.receipt_url} target="_blank" className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs uppercase shadow-xl hover:bg-amber-500 transition-colors">Full Resolution</a>
                        </div>
                      </div>
                      <div className="bg-[#020617] p-3 rounded-lg border border-slate-800 text-center"><p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Stated UTR</p><p className="font-mono text-sm text-white tracking-widest">{selectedOrder.customer_info.utr}</p></div>
                    </div>
                  ) : (
                    <div className="text-center py-4"><p className="text-slate-500 font-bold uppercase text-[10px]">No Photo Provided</p><p className="font-mono text-lg text-white mt-2 tracking-widest">{selectedOrder.customer_info?.utr || 'NOT PROVIDED'}</p></div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Payload</h3>
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-6 bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                    <img src={item.product?.image || FALLBACK_IMG} className="w-16 h-16 object-contain bg-white rounded-xl p-2" />
                    <div className="flex-1"><p className="font-bold text-white line-clamp-2">{item.product?.name}</p><p className="text-sm font-bold text-amber-500 mt-1">Quantity: {item.qty}</p></div>
                  </div>
                ))}
              </div>
              
              <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-3xl space-y-8">
                <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest text-center">Status Control</h3>
                <input type="date" id="del_date" className="w-full p-4 bg-[#020617] border border-slate-700 rounded-xl outline-none focus:border-amber-500 font-bold text-center text-sm" defaultValue={selectedOrder.delivery_date ? selectedOrder.delivery_date.split('T')[0] : ''} />
                <div className="flex flex-col gap-3">
                  <button onClick={() => { const d = (document.getElementById('del_date') as HTMLInputElement).value; updateOrderStatus(selectedOrder.id, 'confirmed', d); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all">Confirm & Validate</button>
                  <div className="flex gap-3">
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-[10px] uppercase font-bold text-white transition-colors">Shipped</button>
                    <button onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl text-[10px] uppercase font-bold text-white transition-colors">Delivered</button>
                  </div>
                  <button onClick={() => handleRejectOrder(selectedOrder.id)} className="w-full bg-transparent text-red-500 border border-red-500/30 font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all">Reject & Purge Signal</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-10 right-10 z-[200] px-6 py-4 rounded-2xl shadow-2xl ${toast.type === 'success' ? 'bg-amber-500 text-slate-900' : 'bg-red-600 text-white'} font-bold animate-pop-in text-xs flex items-center gap-3`}>
          <i className="fas fa-check-circle text-lg"></i> {toast.msg}
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