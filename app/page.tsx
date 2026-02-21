"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  desc: string;
  discount: string;
}

// New Interface for Customer Data
interface UserData {
  user_id: string;
  email: string;
  display_name: string;
  cart_data: any[];
  updated_at: string;
}

export default function AdminDashboard() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'inventory' | 'customers'>('inventory');

  // Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer State
  const [usersData, setUsersData] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("microcontrollers");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState("");
  const [desc, setDesc] = useState("");
  const [discount, setDiscount] = useState("");

  useEffect(() => {
    fetchInventory();
    fetchCustomers();
    
    // Optional: Auto-refresh customer data every 30 seconds
    const interval = setInterval(fetchCustomers, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- DATA FETCHING ---
  async function fetchInventory() {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching data:", error);
    else if (data) setInventory(data);
    setLoading(false);
  }

  async function fetchCustomers() {
    setLoadingUsers(true);
    const { data, error } = await supabase.rpc('get_all_users_and_carts');
    if (error) console.error("Error fetching customer data:", error);
    else if (data) setUsersData(data);
    setLoadingUsers(false);
  }

  // --- HELPERS ---
  const calculateTotal = (cart: any[]) => {
    if (!cart || cart.length === 0) return 0;
    return cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  };

  // --- INVENTORY ACTIONS ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("inventory").insert([{
      name, category, price: parseFloat(price), stock: parseInt(stock), image, desc, discount,
    }]);

    if (!error) {
      setName(""); setPrice(""); setStock(""); setImage(""); setDesc(""); setDiscount("");
      fetchInventory();
    } else {
      alert("Error adding product: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (!error) {
      setInventory(inventory.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Navigation Tabs */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-6">
            Circuit Cart <span className="text-amber-500">Admin Panel</span>
          </h1>
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-px">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'inventory' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-amber-400'}`}
            >
              Manage Inventory
            </button>
            <button 
              onClick={() => setActiveTab('customers')}
              className={`pb-3 px-2 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'customers' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-amber-400'}`}
            >
              Customer Carts 
              <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-full">{usersData.length}</span>
            </button>
          </div>
        </div>

        {/* =========================================
            TAB 1: INVENTORY MANAGEMENT 
            ========================================= */}
        {activeTab === 'inventory' && (
          <div className="animate-in fade-in duration-300">
            {/* Add Product Form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
              <h2 className="text-xl font-bold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                Add New Component
              </h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:ring-2 focus:ring-amber-500 outline-none" placeholder="e.g. Arduino Uno R3" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                      <option value="microcontrollers">Microcontrollers</option>
                      <option value="components">Components</option>
                      <option value="tools">Tools</option>
                      <option value="kits">Kits</option>
                      <option value="projects">Projects</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL</label>
                    <input type="text" required value={image} onChange={(e) => setImage(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Paste image link here..." />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (₹)</label>
                      <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock</label>
                      <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount %</label>
                      <input type="text" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent outline-none focus:ring-2 focus:ring-amber-500" placeholder="20" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Short Description</label>
                  <textarea required value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:ring-2 focus:ring-amber-500 outline-none h-20" placeholder="Briefly describe what this component does..."></textarea>
                </div>

                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded transition-colors shadow-lg shadow-amber-500/30">
                  Add to Live Database
                </button>
              </form>
            </div>

            {/* Inventory List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <h2 className="text-lg font-bold">Manage Live Inventory</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-gray-500">
                      <th className="p-4 font-bold border-b dark:border-gray-700">Preview</th>
                      <th className="p-4 font-bold border-b dark:border-gray-700">Product Info</th>
                      <th className="p-4 font-bold border-b dark:border-gray-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loading ? (
                       <tr><td colSpan={3} className="p-8 text-center text-gray-500">Loading...</td></tr>
                    ) : inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                        <td className="p-4">
                          <img src={item.image} alt="" className="w-12 h-12 object-contain bg-white rounded border border-gray-200" />
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-sm">{item.name}</div>
                          <div className="text-xs text-gray-400 line-clamp-1">{item.desc}</div>
                          {item.discount && <span className="text-[10px] text-red-500 font-bold">-{item.discount}% OFF</span>}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1 rounded text-xs font-bold transition-colors">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 2: CUSTOMERS & CARTS 
            ========================================= */}
        {activeTab === 'customers' && (
          <div className="animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Total Registered Users</h3>
                <p className="text-4xl font-black text-gray-900 dark:text-white">{usersData.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Active Carts</h3>
                <p className="text-4xl font-black text-amber-500">{usersData.filter(u => u.cart_data && u.cart_data.length > 0).length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Potential Cart Revenue</h3>
                <p className="text-4xl font-black text-green-500">
                  ₹{usersData.reduce((acc, user) => acc + calculateTotal(user.cart_data), 0)}
                </p>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4">Customer Details</th>
                    <th className="px-6 py-4">Items in Cart</th>
                    <th className="px-6 py-4">Cart Value</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loadingUsers ? (
                     <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading Customers...</td></tr>
                  ) : usersData.map((user) => (
                    <tr key={user.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 dark:text-white text-base">{user.display_name || 'No Name Provided'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${user.cart_data?.length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {user.cart_data?.length || 0} Items
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        ₹{calculateTotal(user.cart_data)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(user.updated_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedUser(user)}
                          disabled={!user.cart_data || user.cart_data.length === 0}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold hover:bg-amber-500 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                        >
                          Inspect Cart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* =========================================
          MODAL: VIEW CART DETAILS 
          ========================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{selectedUser.display_name}'s Cart</h2>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-500"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {selectedUser.cart_data.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 items-center">
                  <img src={item.product.image} className="w-12 h-12 object-contain bg-white rounded-lg p-1" alt="" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{item.product.name}</h4>
                    <p className="text-xs text-gray-500">{item.product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-600 font-black text-sm">₹{item.product.price * item.qty}</p>
                    <p className="text-xs font-bold text-gray-500">Qty: {item.qty}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
              <span className="text-gray-500 font-bold uppercase text-xs">Total Cart Value</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">₹{calculateTotal(selectedUser.cart_data)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}