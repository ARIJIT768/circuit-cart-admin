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
  desc: string;    // Added description
  discount: string; // Added discount
}

export default function AdminDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("microcontrollers");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState("");
  const [desc, setDesc] = useState("");       // New state for Description
  const [discount, setDiscount] = useState(""); // New state for Discount

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching data:", error);
    } else if (data) {
      setInventory(data);
    }
    setLoading(false);
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("inventory").insert([
      {
        name,
        category,
        price: parseFloat(price),
        stock: parseInt(stock),
        image,
        desc,     // Saving description to DB
        discount, // Saving discount to DB
      },
    ]);

    if (!error) {
      setName("");
      setPrice("");
      setStock("");
      setImage("");
      setDesc("");
      setDiscount("");
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight mb-8">
          Circuit Cart <span className="text-amber-500">Admin Panel</span>
        </h1>

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
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
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
    </div>
  );
}