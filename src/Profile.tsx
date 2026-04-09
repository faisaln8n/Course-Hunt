import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUserAuth } from './components/AuthContext';
import Logo from './components/ui/Logo';
import { userService } from './services/userService';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Edit2, Save, X, Camera, LogOut, Heart, ShoppingCart, Trash2, Star, Target, CreditCard, History, BookOpen, CheckCircle, Wallet, Activity, ChevronRight, MessageCircle, Users, Share2, DollarSign, ExternalLink, Copy, Tag, Wrench, Eye, Clock, ArrowUpRight, RotateCcw, Send } from 'lucide-react';
import { wishlistService } from './services/wishlistService';
import { courseService } from './services/courseService';
import { Course } from './data/courses';
import { cartService } from './services/cartService';
import { walletService, Transaction as WalletTransaction, DepositRequest, WithdrawalRequest, ToolOrder, CourseOrder } from './services/walletService';
import { toolService } from './services/toolService';
import { Tool } from './data/tools';
import { UserProfile } from './services/userService';
import { vipService, VIPRequest } from './services/vipService';
import { toast } from 'sonner';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}
import { AnimatePresence } from 'framer-motion';

const WithdrawalModal = ({ isOpen, onClose, userId, userEmail, balance }: { isOpen: boolean, onClose: () => void, userId: string, userEmail: string, balance: number }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bKash' | 'Binance'>('bKash');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (Number(amount) > balance) {
      toast.error('Insufficient affiliate balance');
      return;
    }
    if (!details) {
      toast.error(`Please enter your ${method === 'bKash' ? 'bKash number' : 'Binance UID'}`);
      return;
    }

    setIsSubmitting(true);
    const result = await walletService.submitWithdrawalRequest({
      userId,
      userEmail,
      amount: Number(amount),
      method,
      details
    });

    if (result.success) {
      toast.success('Withdrawal request submitted successfully');
      onClose();
    } else {
      toast.error(result.error || 'Failed to submit withdrawal request');
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Withdraw Funds</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Available Affiliate Balance</p>
              <p className="text-2xl font-black text-[#FF6B35]">${balance.toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Withdrawal Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setMethod('bKash')}
                  className={cn(
                    "py-3 rounded-2xl font-bold border-2 transition-all",
                    method === 'bKash' ? "border-[#FF6B35] bg-orange-50 text-black" : "border-slate-100 bg-slate-50 text-slate-500"
                  )}
                >
                  bKash
                </button>
                <button 
                  onClick={() => setMethod('Binance')}
                  className={cn(
                    "py-3 rounded-2xl font-bold border-2 transition-all",
                    method === 'Binance' ? "border-[#FF6B35] bg-orange-50 text-black" : "border-slate-100 bg-slate-50 text-slate-500"
                  )}
                >
                  Binance
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Amount ($)</label>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold"
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                {method === 'bKash' ? 'bKash Number' : 'Binance UID'}
              </label>
              <input 
                type="text"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold"
                placeholder={method === 'bKash' ? 'Enter bKash number' : 'Enter Binance UID'}
              />
            </div>

            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 bg-[#FF6B35] text-black rounded-2xl font-black uppercase tracking-wider text-xs hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const DepositModal: React.FC<{ isOpen: boolean; onClose: () => void; user: any }> = ({ isOpen, onClose, user }) => {
  const [step, setStep] = useState<'method' | 'details'>('method');
  const [method, setMethod] = useState<'bKash' | 'Binance' | null>(null);
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [binanceUid, setBinanceUid] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        toast.error('Screenshot too large. Please use an image under 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setScreenshot(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    console.log('Deposit handleSubmit triggered');
    console.log('Current state:', { userId: user.uid, amount, method, transactionId, binanceUid, screenshot: screenshot ? 'present' : 'missing' });
    
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      console.warn('Invalid amount:', amount);
      toast.error('Please enter a valid amount');
      return;
    }

    if (!screenshot) {
      console.warn('Missing screenshot');
      toast.error('Please upload a payment screenshot');
      return;
    }

    if ((method === 'bKash' && !transactionId) || (method === 'Binance' && !binanceUid)) {
      console.warn('Missing transaction details for method:', method);
      toast.error(`Please enter your ${method === 'bKash' ? 'Transaction ID' : 'Binance UID'}`);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting deposit request to walletService...');
      const result = await walletService.submitDepositRequest({
        userId: user.uid,
        userEmail: user.email,
        amount: numAmount,
        method: method!,
        transactionId: method === 'bKash' ? transactionId : undefined,
        binanceUid: method === 'Binance' ? binanceUid : undefined,
        couponCode: couponCode || undefined,
        screenshotUrl: screenshot
      });

      console.log('Deposit submission result:', result);

      if (result.success) {
        toast.success('Deposit request submitted! Admin will review it shortly.');
        onClose();
        // Reset state
        setStep('method');
        setMethod(null);
        setAmount('');
        setTransactionId('');
        setBinanceUid('');
        setCouponCode('');
        setScreenshot(null);
      } else {
        console.error('Deposit submission failed:', result.error);
        toast.error(result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Deposit submission error:', error);
      toast.error('An unexpected error occurred while submitting deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row md:min-h-[600px] max-h-[95vh] md:max-h-[90vh]"
      >
        {/* Left Side: Motivational Text - Hidden on mobile */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B35]/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="mb-10">
              <div className="flex items-center gap-2 group cursor-default">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B35]/20 group-hover:rotate-12 transition-transform duration-500">
                  <span className="text-white font-black text-xl">C</span>
                </div>
                <span className="text-2xl font-black tracking-tighter text-white uppercase">Course<span className="text-[#FF6B35]">Hunt</span></span>
              </div>
            </div>
            <h3 className="text-4xl font-black mb-8 leading-tight uppercase tracking-tight">
              Unlock Your <span className="text-[#FF6B35]">Potential</span> Today
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  Deposit with <span className="text-white font-bold italic">Scratch Person</span> to get instant access to premium courses.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  Join thousands of learners who are already mastering new skills.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-4 h-4 text-[#FF6B35]" />
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  Secure transactions with bKash and Binance.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
            <p className="text-xs font-black text-[#FF6B35] uppercase tracking-widest mb-2">Pro Tip</p>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Use a deposit coupon to get an extra bonus on your wallet balance!
            </p>
          </div>
        </div>

        {/* Right Side: Deposit Form */}
        <div className="w-full md:w-7/12 p-6 md:p-10 bg-white overflow-y-auto">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                {step === 'method' ? 'Select Method' : `Deposit via ${method}`}
              </h3>
              <p className="text-slate-400 text-[10px] md:text-xs font-bold mt-1">Step {step === 'method' ? '1' : '2'} of 2</p>
            </div>
            <button onClick={onClose} className="p-2 md:p-3 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
            </button>
          </div>

          {step === 'method' ? (
            <div className="space-y-4">
              <button 
                onClick={() => { setMethod('bKash'); setStep('details'); }}
                className="w-full flex items-center justify-between p-4 md:p-6 bg-pink-50 border-2 border-pink-100 rounded-2xl md:rounded-3xl hover:border-pink-300 transition-all group"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm">
                    <span className="text-pink-600 font-black text-xl md:text-2xl">b</span>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900 text-base md:text-lg">bKash</p>
                    <p className="text-[10px] md:text-xs text-pink-600 font-bold">Fast & Secure (Personal)</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-pink-300 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => { setMethod('Binance'); setStep('details'); }}
                className="w-full flex items-center justify-between p-4 md:p-6 bg-yellow-50 border-2 border-yellow-100 rounded-2xl md:rounded-3xl hover:border-yellow-300 transition-all group"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm">
                    <span className="text-yellow-600 font-black text-xl md:text-2xl">B</span>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900 text-base md:text-lg">Binance</p>
                    <p className="text-[10px] md:text-xs text-yellow-600 font-bold">Global Crypto (UID)</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-yellow-300 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="w-full flex items-center justify-between p-4 md:p-6 bg-gradient-to-br from-sky-500 to-blue-700 border-2 border-blue-400 rounded-2xl md:rounded-3xl shadow-lg relative overflow-hidden group opacity-90">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex items-center gap-3 md:gap-4 relative z-10">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner border border-white/20">
                    <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white text-base md:text-lg tracking-tight">Stripe Card</p>
                    <p className="text-[10px] md:text-xs text-blue-100 font-bold uppercase tracking-widest">Coming Soon</p>
                  </div>
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] rotate-90 inline-block">STRIPE</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 md:p-6 bg-slate-900 rounded-2xl md:rounded-3xl text-white relative overflow-hidden border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B35]/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Official Payment Detail</p>
                <div className="flex items-center justify-between bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-md group">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[#FF6B35] uppercase tracking-widest mb-1">
                      {method === 'bKash' ? 'bKash Number' : 'Binance ID'}
                    </span>
                    <p className="text-lg md:text-xl font-black tracking-widest font-mono text-white group-hover:text-[#FF6B35] transition-colors">
                      {method === 'bKash' 
                        ? '01314493061' 
                        : '38018802'}
                    </p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(method === 'bKash' ? '01314493061' : '38018802')}
                    className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-[#FF6B35] hover:bg-[#E85D04] text-black rounded-lg md:rounded-xl transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                  >
                    <Copy className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    Copy
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 w-fit">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    {method === 'bKash' ? 'Send money to this personal number' : 'Pay to this Binance ID'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-11 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Coupon Code</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full pl-11 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold text-sm"
                      placeholder="EXTRA10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  {method === 'bKash' ? 'Transaction ID' : 'Binance UID'}
                </label>
                <input 
                  type="text"
                  value={method === 'bKash' ? transactionId : binanceUid}
                  onChange={(e) => method === 'bKash' ? setTransactionId(e.target.value) : setBinanceUid(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold text-sm"
                  placeholder={method === 'bKash' ? "Enter Tx ID" : "Enter UID"}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Payment Screenshot</label>
                <div className="relative group">
                  <div className={cn(
                    "w-full h-32 md:h-40 rounded-2xl md:rounded-3xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all",
                    screenshot ? "border-[#FF6B35] bg-orange-50" : "border-slate-200 bg-slate-50 hover:border-[#FF6B35]"
                  )}>
                    {screenshot ? (
                      <img src={screenshot} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setStep('method')}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-[#FF6B35] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Proof'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const VIPModal = ({ isOpen, onClose, user, profile }: { isOpen: boolean, onClose: () => void, user: any, profile: UserProfile }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    telegramUsername: '',
    whatsappNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRenewal = profile.vipJoinDate ? true : false;
  const price = isRenewal ? 5 : 10;

  const handleSubmit = async () => {
    console.log('VIP handleSubmit triggered');
    console.log('Current state:', { fullName: formData.fullName, telegram: formData.telegramUsername, whatsapp: formData.whatsappNumber, price, balance: profile.walletBalance });
    
    if (!formData.fullName || !formData.telegramUsername || !formData.whatsappNumber) {
      console.warn('Missing form fields');
      toast.error('Please fill all fields');
      return;
    }

    const currentBalance = profile.walletBalance || 0;
    if (currentBalance < price) {
      console.warn('Insufficient balance:', { currentBalance, price });
      toast.error('Insufficient wallet balance. You need to deposite more to join VIP.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Calling vipService.submitVIPRequest...');
      const result = await vipService.submitVIPRequest({
        userId: user.uid,
        userEmail: user.email,
        fullName: formData.fullName,
        telegramUsername: formData.telegramUsername,
        whatsappNumber: formData.whatsappNumber,
        amount: price
      });

      console.log('VIP Request Result:', result);

      if (result.success) {
        toast.success('VIP request submitted! Waiting for admin approval.');
        onClose();
      } else {
        console.error('VIP Request Failed:', result.error);
        toast.error(result.error || 'Failed to submit VIP request');
      }
    } catch (err) {
      console.error('VIP submission error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row min-h-[500px]"
      >
        {/* Left Side: Motivational Text (Slide 1 or Static) */}
        <div className="md:w-5/12 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-10 text-white flex flex-col justify-between relative overflow-hidden border-r border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10">
            <div className="mb-10">
              <div className="flex items-center gap-2 group cursor-default">
                <div className="w-10 h-10 bg-[#FFD700] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFD700]/20 group-hover:rotate-12 transition-transform duration-500">
                  <Star className="text-black w-6 h-6 fill-current" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-white uppercase">VIP<span className="text-[#FFD700]">Club</span></span>
              </div>
            </div>
            <h3 className="text-4xl font-black mb-8 leading-tight uppercase tracking-tight">
              Join the <span className="text-[#FFD700]">Elite</span> Circle
            </h3>
            <div className="space-y-3">
              {[
                "Exclusive discount coupons",
                "Free new courses",
                "Free methods updates",
                "Dedicated support 24/7",
                "Earning tips and tricks",
                "Elite reel bundles and much more"
              ].map((benefit, i) => (
                <div key={i} className="flex gap-3 items-center group/item">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 group-hover/item:bg-[#FFD700]/20 transition-colors">
                    <CheckCircle className="w-4 h-4 text-[#FFD700]" />
                  </div>
                  <p className="text-slate-300 text-xs font-bold leading-tight group-hover/item:text-white transition-colors">
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-12 p-6 bg-white/10 rounded-3xl border-2 border-[#FFD700]/30 backdrop-blur-md shadow-xl">
            <p className="text-xs font-black text-[#FFD700] uppercase tracking-widest mb-2">Membership Fee</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">${price}</span>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {isRenewal ? '/ month renewal' : 'first month'}
              </span>
            </div>
            {!isRenewal && (
              <div className="mt-3 py-1.5 px-3 bg-[#FFD700] rounded-lg inline-block">
                <p className="text-[10px] text-black font-black uppercase tracking-tighter">Next month renews at only $5</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: 2-Slide Content */}
        <div className="md:w-7/12 p-10 bg-white flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {step === 1 ? 'Why Join VIP?' : 'Complete Registration'}
              </h3>
              <p className="text-slate-400 text-xs font-bold mt-1">Step {step} of 2</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="slide1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <div className="flex-1 space-y-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-slate-600 font-medium leading-relaxed">
                      Our VIP membership is designed for serious learners and creators who want to stay ahead of the curve. By joining, you're not just getting discounts; you're joining a community of like-minded individuals.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                      <p className="text-2xl font-black text-blue-600">24/7</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">VIP Support</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-400 text-center italic">
                    "The best investment I've made for my digital career." - VIP Member
                  </p>
                </div>
                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#FF6B35] hover:text-black transition-all shadow-xl mt-8"
                >
                  Continue to Join
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="slide2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                    <input 
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Telegram Username</label>
                    <input 
                      type="text"
                      value={formData.telegramUsername}
                      onChange={(e) => setFormData(prev => ({ ...prev, telegramUsername: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold text-sm"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">WhatsApp Number</label>
                    <input 
                      type="text"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-[#FF6B35] transition-all font-bold text-sm"
                      placeholder="+1234567890"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total to Pay</p>
                    <p className="text-xl font-black text-slate-900">${price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wallet Balance</p>
                    <p className="text-sm font-bold text-slate-600">${(profile.walletBalance || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-[2] py-4 bg-[#FFD700] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-[#FFD700]/20 border-b-4 border-yellow-600"
                  >
                    {isSubmitting ? 'Processing...' : 'Join VIP Now'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const Profile: React.FC = () => {
  const { user, profile, loading, refreshProfile, logout } = useUserAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [wishlistCourses, setWishlistCourses] = useState<Course[]>([]);
  const [editData, setEditData] = useState({
    displayName: '',
    bio: '',
    photoURL: '',
    coverURL: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cartCount, setCartCount] = useState(cartService.getCartCount());
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [referredUsers, setReferredUsers] = useState<UserProfile[]>([]);
  const [purchasedCourses, setPurchasedCourses] = useState<Course[]>([]);
  const [courseOrders, setCourseOrders] = useState<CourseOrder[]>([]);
  const [toolOrders, setToolOrders] = useState<ToolOrder[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ToolOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'courses' | 'tools' | 'wishlist' | 'support' | 'affiliate'>('profile');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'wallet', 'courses', 'tools', 'wishlist', 'support', 'affiliate'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, []);
  const [supportMessage, setSupportMessage] = useState('');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isVIPModalOpen, setIsVIPModalOpen] = useState(false);
  const [vipRequests, setVIPRequests] = useState<VIPRequest[]>([]);

  useEffect(() => {
    if (user) {
      const fetchVIPRequests = async () => {
        const requests = await vipService.getUserVIPRequests(user.uid);
        setVIPRequests(requests);
      };
      fetchVIPRequests();
    }
  }, [user]);

  useEffect(() => {
    const fetchTools = async () => {
      const tools = await toolService.getTools();
      setAllTools(tools);
    };
    fetchTools();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        photoURL: profile.photoURL || '',
        coverURL: profile.coverURL || ''
      });
    }

    const loadWishlist = async () => {
      const allCourses = await courseService.getCourses();
      const wishlistIds = wishlistService.getWishlistItems();
      const filtered = allCourses.filter(c => wishlistIds.includes(String(c.id)));
      setWishlistCourses(filtered);
    };

    let transactionsUnsubscribe: (() => void) | null = null;
    let depositRequestsUnsubscribe: (() => void) | null = null;
    let referredUsersUnsubscribe: (() => void) | null = null;
    let withdrawalsUnsubscribe: (() => void) | null = null;
    let toolOrdersUnsubscribe: (() => void) | null = null;
    let courseOrdersUnsubscribe: (() => void) | null = null;

    const loadWalletData = async () => {
      if (user) {
        const [
          txs,
          reqs,
          users,
          withs,
          tOrders,
          cOrders
        ] = await Promise.all([
          walletService.getTransactions(user.uid),
          walletService.getUserDepositRequests(user.uid),
          userService.getReferredUsers(user.uid),
          walletService.getUserWithdrawals(user.uid),
          walletService.getUserToolOrders(user.uid),
          walletService.getUserCourseOrders(user.uid)
        ]);

        setTransactions(txs);
        setDepositRequests(reqs);
        setReferredUsers(users);
        setWithdrawalRequests(withs);
        setToolOrders(tOrders);
        setCourseOrders(cOrders);
      }
    };

    const loadPurchasedCourses = async () => {
      if (profile?.purchasedCourses) {
        const allCourses = await courseService.getCourses();
        const filtered = allCourses.filter(c => profile.purchasedCourses?.includes(String(c.id)));
        setPurchasedCourses(filtered);
      }
    };

    const handleWishlistUpdate = () => {
      loadWishlist();
    };

    const handleCartUpdate = () => {
      setCartCount(cartService.getCartCount());
    };

    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('cart-updated', handleCartUpdate);
    loadWishlist();
    loadWalletData();
    loadPurchasedCourses();

    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('cart-updated', handleCartUpdate);
      if (transactionsUnsubscribe) transactionsUnsubscribe();
      if (depositRequestsUnsubscribe) depositRequestsUnsubscribe();
      if (referredUsersUnsubscribe) referredUsersUnsubscribe();
      if (withdrawalsUnsubscribe) withdrawalsUnsubscribe();
      if (toolOrdersUnsubscribe) toolOrdersUnsubscribe();
      if (courseOrdersUnsubscribe) courseOrdersUnsubscribe();
    };
  }, [profile, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 800KB for base64 storage in Firestore)
    if (file.size > 800 * 1024) {
      toast.error('File is too large. Please select an image under 800KB.');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'photo') {
          setEditData(prev => ({ ...prev, photoURL: base64String }));
        } else {
          setEditData(prev => ({ ...prev, coverURL: base64String }));
        }
        setIsUploading(false);
        toast.success(`${type === 'photo' ? 'Profile picture' : 'Cover photo'} uploaded! Click Save to persist changes.`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload image.');
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await userService.updateUserProfile(user.uid, editData);
      await refreshProfile();
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#FF6B35] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header - Standard Style */}
      <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/tools" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <Link to="/" className="no-underline">
              <Logo size="md" />
            </Link>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new Event('open-cart'))}
            className="relative p-2 text-slate-600 hover:text-[#FF6B35] transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF6B35] text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="py-8 md:py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Desktop Header - Card Style */}
          <div className="hidden md:flex flex-row items-center justify-between mb-12 gap-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <Link to="/" className="no-underline">
              <Logo size="lg" className="origin-center" />
            </Link>
            <div className="flex items-center gap-10">
              <button 
                onClick={() => window.dispatchEvent(new Event('open-cart'))}
                className="relative p-3 text-slate-600 hover:text-[#FF6B35] transition-colors bg-slate-50 rounded-full"
              >
                <ShoppingCart className="w-7 h-7" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF6B35] text-white text-[12px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
              
              <Link to="/tools" className="inline-flex items-center text-slate-600 hover:text-[#FF6B35] transition-colors no-underline group">
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="text-base font-black uppercase tracking-[0.15em]">Back to Tools</span>
              </Link>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-2">
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                  activeTab === 'profile' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <User className="w-5 h-5" />
                Profile
              </button>
              <button 
                onClick={() => setActiveTab('courses')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                  activeTab === 'courses' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <BookOpen className="w-5 h-5" />
                My Courses
              </button>
              <button 
                onClick={() => setActiveTab('tools')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                  activeTab === 'tools' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Wrench className="w-5 h-5" />
                My Tools
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                  activeTab === 'wallet' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <CreditCard className="w-5 h-5" />
                Wallet
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                  activeTab === 'wishlist' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Heart className="w-5 h-5" />
                Wishlist
              </button>
              <button 
                onClick={() => setActiveTab('affiliate')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                  activeTab === 'affiliate' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Users className="w-5 h-5" />
                Affiliate
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                  activeTab === 'support' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <MessageCircle className="w-5 h-5" />
                Support
              </button>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button 
                  onClick={async () => {
                    await logout();
                    navigate('/');
                    toast.success('Logged out successfully');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Quick Stats</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Courses Owned</span>
                  <span className="font-black">{purchasedCourses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Tools Owned</span>
                  <span className="font-black">{toolOrders.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Wishlist Items</span>
                  <span className="font-black">{wishlistCourses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Wallet Balance</span>
                  <span className="font-black text-[#FF6B35]">${(profile.walletBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    {/* Header/Cover */}
                    <div className="relative h-48 group">
                    {editData.coverURL ? (
                      <img src={editData.coverURL} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-r from-[#FF6B35] to-[#E85D04]"></div>
                    )}
                    {isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg transition-all">
                          <Camera className="w-4 h-4" />
                          Change Cover
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'cover')}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-8 pb-8">
                    <div className="relative -mt-16 mb-6 flex justify-between items-end">
                      <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg">
                          {editData.photoURL ? (
                            <img src={editData.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                              <User className="w-16 h-16 text-slate-400" />
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-[#FF6B35] hover:bg-slate-50 transition-colors cursor-pointer">
                            <Camera className="w-5 h-5" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'photo')}
                            />
                          </label>
                        )}
                      </div>

                      {!isEditing ? (
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all active:scale-95"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Profile
                        </button>
                      ) : (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200 transition-all active:scale-95"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                          <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B35] text-black rounded-full font-bold hover:bg-[#E85D04] transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-8">
                      {/* Basic Info */}
                      <section>
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Display Name</label>
                              <input 
                                type="text"
                                value={editData.displayName}
                                onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                                placeholder="Your name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Bio</label>
                              <textarea 
                                value={editData.bio}
                                onChange={(e) => setEditData({...editData, bio: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all min-h-[100px]"
                                placeholder="Tell us about yourself..."
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-1">{profile.displayName || 'Anonymous User'}</h1>
                            <p className="text-[#FF6B35] font-medium text-sm mb-4 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" />
                              {profile.email}
                            </p>
                            <p className="text-slate-600 leading-relaxed max-w-2xl">
                              {profile.bio || 'No bio provided yet. Click edit to add one!'}
                            </p>
                          </div>
                        )}
                      </section>

                      {/* Account Details */}
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                            <p className="text-slate-700 font-medium">{profile.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Role</p>
                            <p className="text-slate-700 font-medium capitalize">{profile.role}</p>
                          </div>
                        </div>
                      </section>

                    </div>

                      {/* VIP Membership Card */}
                      <div className="mt-12 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-md mb-4">
                              <Star className="w-4 h-4 text-[#FFD700] fill-current" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">VIP Membership</span>
                            </div>
                            <h3 className="text-3xl font-black mb-2 tracking-tight uppercase">
                              {profile.vipStatus === 'active' ? 'You are a VIP Member!' : 'Join the VIP Club'}
                            </h3>
                            <p className="text-slate-300 text-sm font-medium max-w-md leading-relaxed">
                              {profile.vipStatus === 'active' 
                                ? `Your membership is active until ${new Date(profile.vipExpiryDate!).toLocaleDateString()}. Enjoy exclusive benefits!`
                                : profile.vipStatus === 'pending'
                                ? 'Your VIP request is being reviewed by our team. You will be notified once approved.'
                                : 'Unlock exclusive discounts, early access to new tools, and priority support. Join thousands of elite members today.'}
                            </p>
                          </div>

                          <div className="flex flex-col items-center gap-4">
                            {profile.vipStatus === 'active' ? (
                              <div className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl text-center">
                                <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest mb-1">Status</p>
                                <p className="text-xl font-black text-white">ACTIVE</p>
                              </div>
                            ) : profile.vipStatus === 'pending' ? (
                              <div className="px-8 py-4 bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 rounded-3xl text-center">
                                <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">Status</p>
                                <p className="text-xl font-black text-white">PENDING APPROVAL</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">${profile.vipJoinDate ? '5' : '10'}</span>
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                      {profile.vipJoinDate ? '/ month' : 'first month'}
                                    </span>
                                  </div>
                                  {!profile.vipJoinDate && (
                                    <p className="text-[10px] font-black text-[#FFD700] uppercase tracking-tighter mb-2">Next month only $5</p>
                                  )}
                                </div>
                                <button 
                                  onClick={() => setIsVIPModalOpen(true)}
                                  className="px-10 py-4 bg-[#FFD700] text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95"
                                >
                                  Join Now
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'courses' && (
                <motion.div 
                  key="courses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">My Courses</h2>
                    <span className="px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{courseOrders.length} Courses</span>
                  </div>

                  {courseOrders.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">No courses yet</h3>
                      <p className="text-slate-500 mb-8 max-w-xs mx-auto">Start your learning journey today by exploring our marketplace!</p>
                      <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF6B35] text-black font-black rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-wider text-sm"
                      >
                        Explore Courses
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {courseOrders.map((order) => {
                        const course = purchasedCourses.find(c => c.id === order.courseId);
                        return (
                          <motion.div
                            key={order.id}
                            className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group"
                          >
                            <div className="relative h-40 overflow-hidden">
                              <img src={course?.image || ''} alt={order.courseTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase rounded-full shadow-lg">
                                Purchased
                              </div>
                              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold rounded-lg">
                                Order #{order.id?.slice(-6).toUpperCase()}
                              </div>
                            </div>
                            <div className="p-6">
                              <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">{order.courseTitle}</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                                {order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString() : 'Just now'}
                              </p>
                              <button 
                                onClick={() => {
                                  if (course?.courseLink) {
                                    window.location.href = course.courseLink;
                                  } else {
                                    navigate(`/course/${order.courseId}`);
                                  }
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                              >
                                Go to Course
                                <ArrowLeft className="w-4 h-4 rotate-180" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'tools' && (
                <motion.div 
                  key="tools"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">My Tools</h2>
                    <span className="px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{toolOrders.length} Tools</span>
                  </div>

                  {toolOrders.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Wrench className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">No tools yet</h3>
                      <p className="text-slate-500 mb-8 max-w-xs mx-auto">Enhance your workflow with our premium tools and resources!</p>
                      <Link 
                        to="/tools" 
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF6B35] text-black font-black rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-wider text-sm"
                      >
                        Explore Tools
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {toolOrders.map((order) => {
                        const tool = allTools.find(t => t.id === order.toolId);
                        if (!tool) return null;
                        
                        return (
                          <motion.div
                            key={order.id}
                            className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group"
                          >
                            <div className="relative h-40 overflow-hidden">
                              <img src={tool.image || ''} alt={tool.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className={cn(
                                "absolute top-4 right-4 px-3 py-1 text-white text-[10px] font-black uppercase rounded-full shadow-lg",
                                order.status === 'Purchased' ? "bg-green-500" : 
                                order.status === 'Rejected' ? "bg-red-500" : 
                                "bg-yellow-500"
                              )}>
                                {order.status}
                              </div>
                              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold rounded-lg">
                                Order #{order.id?.slice(-6).toUpperCase()}
                              </div>
                            </div>
                            <div className="p-6">
                              <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">{tool.title}</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                                {order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString() : 'Just now'}
                              </p>
                              <div className="flex flex-col gap-3">
                                <button 
                                  onClick={() => setSelectedOrder(order)}
                                  disabled={order.status !== 'Purchased'}
                                  className={cn(
                                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                                    order.status === 'Purchased' ? "bg-[#FF6B35] text-black hover:shadow-lg" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  )}
                                >
                                  {order.status === 'Purchased' ? (
                                    <>
                                      <Eye className="w-4 h-4" />
                                      Show Info
                                    </>
                                  ) : order.status === 'Rejected' ? (
                                    <>
                                      <X className="w-4 h-4" />
                                      Order Rejected
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-4 h-4" />
                                      Pending Review
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'wallet' && (
                <motion.div 
                  key="wallet"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Wallet Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Balance Card */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-[100px] group-hover:bg-blue-500/20 transition-all duration-700"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF6B35]/5 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-10">
                          <div className="flex items-center gap-4">
                            <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-xl border border-white/10 shadow-inner">
                              <Wallet className="w-8 h-8 text-[#FF6B35]" />
                            </div>
                            <div>
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Available Funds</p>
                              <h3 className="text-xl font-black tracking-tight">Main Wallet</h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Active</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-slate-500 text-xs font-bold ml-1">Current Balance</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black tracking-tighter">${(profile.walletBalance || 0).toLocaleString()}</span>
                            <span className="text-slate-500 font-bold text-sm uppercase tracking-widest">USD</span>
                          </div>
                        </div>

                        <div className="mt-10 flex items-center gap-6">
                          <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="User" className="w-full h-full object-cover opacity-50" />
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trusted by 10k+ Learners</p>
                        </div>
                      </div>
                    </div>

                    {/* Deposit Card */}
                    <div className="bg-gradient-to-br from-[#FF6B35] via-[#E85D04] to-[#FF6B35] rounded-[2.5rem] p-10 text-black shadow-2xl relative overflow-hidden group border border-white/20">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-white/30 rounded-full -mr-40 -mt-40 blur-[100px] group-hover:bg-white/40 transition-all duration-700"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
                      
                      <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                              <div className="p-4 bg-black/10 rounded-3xl backdrop-blur-xl border border-black/5 shadow-inner">
                                <CreditCard className="w-8 h-8 text-black" />
                              </div>
                              <div>
                                <p className="text-black/60 text-[10px] font-black uppercase tracking-[0.2em]">Quick Recharge</p>
                                <h3 className="text-xl font-black tracking-tight">Add Balance</h3>
                              </div>
                            </div>
                            <div className="bg-black/10 px-3 py-1 rounded-full border border-black/5">
                              <span className="text-[9px] font-black text-black uppercase tracking-widest">Instant</span>
                            </div>
                          </div>
                          
                          <h2 className="text-3xl font-black mb-2 uppercase tracking-tight leading-none">Boost Your <br />Learning Power</h2>
                          <p className="text-black/60 text-sm font-bold max-w-[200px]">Top up your wallet instantly using bKash or Binance UID.</p>
                        </div>

                        <button 
                          onClick={() => {
                            console.log('Opening Deposit Modal');
                            setIsDepositModalOpen(true);
                          }}
                          className="mt-10 w-full py-5 bg-black text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all active:scale-95 flex items-center justify-center gap-3 group/btn"
                        >
                          <DollarSign className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                          Deposit Now
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Deposit Requests */}
                  {depositRequests.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl p-8">
                      <div className="flex items-center gap-3 mb-8">
                        <Activity className="w-6 h-6 text-slate-400" />
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Deposit Requests</h3>
                      </div>
                      <div className="space-y-4">
                        {depositRequests.map((req) => (
                          <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                                req.method === 'bKash' ? "bg-pink-50 text-pink-500" : "bg-yellow-50 text-yellow-600"
                              )}>
                                <span className="font-black text-xl">{req.method[0]}</span>
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">Deposit via {req.method}</p>
                                <p className="text-xs text-slate-400 font-medium">
                                  {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString() : 'Just now'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-slate-900">${req.amount.toLocaleString()}</p>
                              <span className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                req.status === 'Pending' ? "bg-blue-100 text-blue-600" :
                                req.status === 'Paid' ? "bg-green-100 text-green-600" :
                                "bg-red-100 text-red-600"
                              )}>
                                {req.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  <div className="bg-white rounded-3xl shadow-xl p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <History className="w-6 h-6 text-slate-400" />
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Transaction History</h3>
                    </div>

                    {transactions.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-slate-400 font-medium">No transactions found yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.map((tx) => {
                          const getTxDetails = (type: string) => {
                            switch (type) {
                              case 'deposit':
                                return { icon: CreditCard, color: 'bg-green-50 text-green-500', label: 'Deposit' };
                              case 'withdrawal':
                                return { icon: ArrowUpRight, color: 'bg-red-50 text-red-500', label: 'Withdrawal' };
                              case 'course_purchase':
                                return { icon: BookOpen, color: 'bg-blue-50 text-blue-500', label: 'Course' };
                              case 'tool_purchase':
                                return { icon: Wrench, color: 'bg-purple-50 text-purple-500', label: 'Tool' };
                              case 'affiliate_commission':
                                return { icon: Users, color: 'bg-amber-50 text-amber-500', label: 'Affiliate' };
                              case 'vip_join':
                                return { icon: Star, color: 'bg-yellow-50 text-yellow-500', label: 'VIP' };
                              case 'refund':
                                return { icon: RotateCcw, color: 'bg-slate-50 text-slate-500', label: 'Refund' };
                              default:
                                return { icon: ShoppingCart, color: 'bg-slate-50 text-slate-500', label: 'Purchase' };
                            }
                          };

                          const details = getTxDetails(tx.type);
                          const Icon = details.icon;

                          return (
                            <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                                  details.color
                                )}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                      details.color
                                    )}>
                                      {details.label}
                                    </span>
                                    <p className="font-bold text-slate-900">{tx.description}</p>
                                  </div>
                                  <p className="text-xs text-slate-400 font-medium">
                                    {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString() : 'Just now'}
                                  </p>
                                </div>
                              </div>
                              <div className={cn(
                                "text-lg font-black",
                                (tx.type === 'deposit' || tx.type === 'affiliate_commission' || tx.type === 'refund') ? "text-green-500" : "text-red-500"
                              )}>
                                {(tx.type === 'deposit' || tx.type === 'affiliate_commission' || tx.type === 'refund') ? '+' : ''}{tx.amount.toLocaleString()}$
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'wishlist' && (
                <motion.div 
                  key="wishlist"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">My Wishlist</h2>
                    <span className="px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{wishlistCourses.length} Items</span>
                  </div>

                  {wishlistCourses.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Your wishlist is empty</h3>
                      <p className="text-slate-500 mb-8 max-w-xs mx-auto">Explore our courses and save your favorites here for later!</p>
                      <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF6B35] text-black font-black rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-wider text-sm"
                      >
                        Explore Courses
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {wishlistCourses.map((course) => (
                        <motion.div
                          key={course.id}
                          className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col"
                        >
                          <div className="relative h-40 overflow-hidden">
                            <img src={course.image || ''} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <button 
                              onClick={() => wishlistService.toggleWishlist(String(course.id))}
                              className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-xl text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-all active:scale-90"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-6 flex-1 flex flex-col">
                            <h3 className="font-bold text-slate-900 mb-4 line-clamp-2 leading-tight">{course.title}</h3>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="font-black text-xl text-[#FF6B35]">{course.price}</span>
                              <div className="flex gap-2">
                                <Link 
                                  to={`/course/${course.id}`}
                                  className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
                                >
                                  <ArrowLeft className="w-5 h-5 rotate-180" />
                                </Link>
                                <button 
                                  onClick={() => {
                                    if (!cartService.isInCart(course.id, 'course')) {
                                      cartService.addToCart(course.id, 'course');
                                      toast.success('Added to cart!');
                                      window.dispatchEvent(new Event('open-cart'));
                                    } else {
                                      window.dispatchEvent(new Event('open-cart'));
                                    }
                                  }}
                                  className="p-2 bg-[#FF6B35] text-black rounded-xl hover:shadow-md transition-all"
                                >
                                  <ShoppingCart className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'affiliate' && (
                <motion.div 
                  key="affiliate"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl shadow-xl p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Affiliate Program</h2>
                        <p className="text-slate-500 text-sm font-medium">Earn 30% commission on your referrals' first purchase.</p>
                      </div>
                      <button 
                        onClick={() => setIsWithdrawModalOpen(true)}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Withdraw Funds
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                            <Users className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Referrals</span>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{referredUsers.length}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-orange-100 text-[#FF6B35] rounded-xl">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Affiliate Balance</span>
                        </div>
                        <p className="text-3xl font-black text-[#FF6B35]">${(profile.affiliateBalance || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-3xl text-white mb-8">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Your Referral Link</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}?ref=${profile.uid}`}
                          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.uid}`);
                            toast.success('Referral link copied!');
                          }}
                          className="p-3 bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          Referred Users
                        </h3>
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Joined</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {referredUsers.length === 0 ? (
                                  <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-bold">No referrals yet</td>
                                  </tr>
                                ) : (
                                  referredUsers.map((u) => (
                                    <tr key={u.uid} className="hover:bg-white transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold overflow-hidden">
                                            {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : u.email[0].toUpperCase()}
                                          </div>
                                          <span className="text-sm font-bold text-slate-900">{u.email}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className={cn(
                                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                          (u.purchasedCourses?.length || 0) > 0 ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"
                                        )}>
                                          {(u.purchasedCourses?.length || 0) > 0 ? 'Commission Earned' : 'Pending Purchase'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                          <History className="w-5 h-5 text-orange-500" />
                          Withdrawal History
                        </h3>
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Method</th>
                                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {withdrawalRequests.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold">No withdrawal requests yet</td>
                                  </tr>
                                ) : (
                                  withdrawalRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-white transition-colors">
                                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                        {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleDateString() : 'Pending...'}
                                      </td>
                                      <td className="px-6 py-4 text-sm font-black text-slate-900">${req.amount.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-sm text-slate-500 font-bold">{req.method}</td>
                                      <td className="px-6 py-4">
                                        <span className={cn(
                                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                          req.status === 'Processed' ? "bg-green-100 text-green-600" :
                                          req.status === 'Pending' ? "bg-orange-100 text-orange-600" :
                                          req.status === 'Approved' ? "bg-blue-100 text-blue-600" :
                                          "bg-red-100 text-red-600"
                                        )}>
                                          {req.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'support' && (
                <motion.div 
                  key="support"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl shadow-xl p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-4 bg-sky-50 rounded-2xl text-sky-600">
                        <Send className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Customer Support</h2>
                        <p className="text-slate-500 text-sm font-medium">We're here to help you with any issues or questions.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Describe your problem</label>
                        <textarea 
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-sky-500 transition-all font-medium min-h-[200px] resize-none"
                          placeholder="How can we help you today?"
                        />
                      </div>

                      <button 
                        onClick={() => {
                          if (!supportMessage.trim()) {
                            toast.error('Please describe your problem first.');
                            return;
                          }
                          const encodedMessage = encodeURIComponent(`Support Request\n\nEmail: ${user?.email}\n\nProblem:\n${supportMessage}`);
                          window.open(`https://t.me/cheapshotadmin?text=${encodedMessage}`, '_blank');
                        }}
                        className="w-full py-4 bg-[#0088cc] text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <Send className="w-6 h-6" />
                        Send via Telegram
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tight">
                  <Wrench className="w-7 h-7 text-[#FF6B35]" />
                  Tool Info
                </h2>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-3 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tool Name</h4>
                  <p className="text-lg font-bold text-slate-900">{selectedOrder.toolTitle}</p>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Account Info / Credentials</h4>
                  <div className="p-6 bg-slate-900 rounded-3xl text-white relative group">
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {selectedOrder.accountInfo || 'No info provided yet.'}
                    </pre>
                    {selectedOrder.accountInfo && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrder.accountInfo || '');
                          toast.success('Info copied to clipboard!');
                        }}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    Please keep this information secure. Do not share your account credentials with anyone.
                  </p>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#FF6B35] transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
        user={user}
      />

      <WithdrawalModal 
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        userId={user.uid}
        userEmail={user.email || ''}
        balance={profile.affiliateBalance || 0}
      />

      <VIPModal
        isOpen={isVIPModalOpen}
        onClose={() => setIsVIPModalOpen(false)}
        user={user}
        profile={profile}
      />
    </div>
  );
};

export default Profile;
