"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase'; // Ensure this path is correct for your admin app
import { useRouter } from 'next/navigation';

export default function AdminAuthPage() {
  const [email, setEmail] = useState('');
  
  // 🛡️ OTP STATE MANAGEMENT
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0); 
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const router = useRouter();

  // 📡 ADMIN CLEARANCE CHECKER
  const verifyAdminClearance = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || data?.role !== 'admin') {
      await supabase.auth.signOut();
      setErrorMsg('ACCESS DENIED: Level 5 Clearance Required.');
      return false;
    }
    return true;
  };

  // 📡 The "Magic Link Catcher"
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setLoading(true);
        const isAdmin = await verifyAdminClearance(session.user.id);
        
        if (isAdmin) {
          setSuccessMsg('Clearance Verified! Redirecting to Central Control...');
          setTimeout(() => { window.location.href = '/admin/dashboard'; }, 600);
        } else {
          setLoading(false);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ⏱️ Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // STEP 1: REQUEST THE 6-DIGIT CODE
  const handleSendOtp = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (loading || resendTimer > 0) return;

    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: cleanEmail,
        options: {
          shouldCreateUser: false, // Prevents creating new users from the admin panel
        }
      });
      
      if (error) {
        if (error.message.includes('Signups not allowed') || error.message.includes('not found')) {
          throw new Error("ACCESS DENIED: Email not recognized in the system.");
        }
        throw error;
      }
      
      setIsOtpSent(true);
      setResendTimer(60); 
      setSuccessMsg('Security code sent to your email.');
      setOtp(''); 
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send code. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY THE 6-DIGIT CODE
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (otp.trim().length !== 6) {
      setErrorMsg('Security code must be exactly 6 digits.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      });

      if (error) throw error;

      // Ensure the user actually has admin rights before redirecting
      if (data.user) {
        const isAdmin = await verifyAdminClearance(data.user.id);
        if (isAdmin) {
          setSuccessMsg('Clearance Verified! Accessing Central Control...');
          setTimeout(() => { window.location.href = '/admin/dashboard'; }, 1000);
        }
      }
    } catch (err: any) {
      setErrorMsg("Invalid or expired code. Please try again.");
      setOtp(''); 
      setLoading(false);
    } 
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-4 font-sans selection:bg-red-500/30">
      
      <div className="mb-8 flex items-center animate-pop-in">
        <span className="text-4xl md:text-3xl font-black text-white tracking-tight uppercase">
          CENTRAL<span className="text-red-600">CONTROL</span>
        </span>
      </div>

      <div className="max-w-md w-full bg-[#131921] p-8 md:p-10 rounded-2xl border border-slate-800 shadow-2xl animate-pop-in relative overflow-hidden">
        
        {/* Changed top accent bar to red for Admin styling */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>

        <h2 className="text-2xl font-black text-white mb-2 tracking-wide uppercase text-center">
          {isOtpSent ? 'Verify Identity' : 'Admin Login'}
        </h2>
        <p className="text-[10px] text-slate-500 mb-8 text-center uppercase tracking-widest font-bold">
          RESTRICTED ACCESS. LEVEL 5 CLEARANCE REQUIRED.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wide flex items-start gap-3 shadow-inner">
            <i className="fas fa-exclamation-triangle mt-0.5 text-base"></i>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold uppercase tracking-wide flex items-start gap-3 shadow-inner">
            <i className="fas fa-shield-check mt-0.5 text-base"></i>
            <p className="leading-relaxed">{successMsg}</p>
          </div>
        )}

        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-6 animate-pop-in">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Email <span className="text-red-500">*</span></label>
              <input 
                type="email" 
                required 
                className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-red-600 outline-none transition-colors font-bold text-sm shadow-inner placeholder:text-slate-600"
                placeholder="admin@circuitcart.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading || email.trim() === ''}
              className="w-full bg-white hover:bg-gray-200 text-slate-900 font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)] text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-3"
            >
              {loading ? <><i className="fas fa-circle-notch fa-spin text-base"></i> Verifying...</> : 'Request Access'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-pop-in">
            <div className="space-y-2 text-center">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Enter 6-Digit Security Code</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                disabled={loading}
                className="w-full p-4 rounded-xl bg-[#020617] text-white border border-slate-700 focus:border-red-600 outline-none transition-colors font-mono font-black text-3xl tracking-[1em] text-center shadow-inner placeholder:text-slate-700 disabled:opacity-50"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
              />
              <p className="text-[10px] text-slate-500 mt-3">Transmitted to: <b className="text-white">{email}</b></p>
            </div>
            
            <button 
              type="submit" 
              disabled={loading || otp.length !== 6}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_15px_rgba(220,38,38,0.3)] text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-3"
            >
              {loading ? <><i className="fas fa-circle-notch fa-spin text-base"></i> Authenticating...</> : 'Verify Credentials'}
            </button>

            <div className="flex flex-col gap-3 mt-4 items-center border-t border-slate-800 pt-4">
              <button 
                type="button"
                onClick={handleSendOtp}
                disabled={resendTimer > 0 || loading}
                className="text-[11px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-white"
              >
                {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
              </button>

              <button 
                type="button"
                onClick={() => { setIsOtpSent(false); setOtp(''); setSuccessMsg(''); setResendTimer(0); }}
                className="text-[11px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
              >
                ← Abort & Return
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx global>{`
        .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}