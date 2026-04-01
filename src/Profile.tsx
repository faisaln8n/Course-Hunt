import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUserAuth } from './components/AuthContext';
import Logo from './components/ui/Logo';
import { userService } from './services/userService';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Edit2, Save, X, Camera, LogOut, Heart, ShoppingCart, Trash2, Star, Target, CreditCard, History, BookOpen, CheckCircle, Wallet } from 'lucide-react';
import { wishlistService } from './services/wishlistService';
import { courseService } from './services/courseService';
import { Course } from './data/courses';
import { cartService } from './services/cartService';
import { walletService, Transaction as WalletTransaction } from './services/walletService';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

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
  const [purchasedCourses, setPurchasedCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'courses' | 'wishlist'>('profile');

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

    const loadWalletData = () => {
      if (user) {
        if (transactionsUnsubscribe) transactionsUnsubscribe();
        transactionsUnsubscribe = walletService.onTransactionsSnapshot(user.uid, (txs) => {
          setTransactions(txs);
        });
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
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <Link to="/" className="no-underline">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
              <Wallet className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-sm font-black text-slate-900">${(profile.walletBalance || 0).toLocaleString()}</span>
            </div>
            <Link to="/" className="relative p-2 text-slate-600 hover:text-[#FF6B35] transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartCount >= 0 && (
                <span className="absolute top-0 right-0 bg-[#FF6B35] text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link to="/" className="inline-flex items-center text-slate-600 hover:text-[#FF6B35] transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Back to Marketplace</span>
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
                  className="bg-white rounded-3xl shadow-xl overflow-hidden"
                >
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

                      {/* Private Data Notice */}
                      <section className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                        <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Private Account
                        </h3>
                        <p className="text-amber-700 text-sm leading-relaxed">
                          Your account data is strictly private. Only you can access and modify your personal information. Other users cannot see your email or private details.
                        </p>
                      </section>
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
                    <span className="px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{purchasedCourses.length} Courses</span>
                  </div>

                  {purchasedCourses.length === 0 ? (
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
                      {purchasedCourses.map((course) => (
                        <motion.div
                          key={course.id}
                          className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group"
                        >
                          <div className="relative h-40 overflow-hidden">
                            <img src={course.image || ''} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase rounded-full shadow-lg">
                              Purchased
                            </div>
                          </div>
                          <div className="p-6">
                            <h3 className="font-bold text-slate-900 mb-4 line-clamp-2 leading-tight">{course.title}</h3>
                            <Link 
                              to={`/course/${course.id}`}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                            >
                              Go to Course
                              <ArrowLeft className="w-4 h-4 rotate-180" />
                            </Link>
                          </div>
                        </motion.div>
                      ))}
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
                  {/* Balance Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF6B35]/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Available Balance</p>
                      <h2 className="text-5xl font-black mb-8">${(profile.walletBalance || 0).toLocaleString()}</h2>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-bold text-slate-300">Secure Wallet</span>
                        </div>
                      </div>
                    </div>
                  </div>

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
                        {transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                                tx.type === 'deposit' ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                              )}>
                                {tx.type === 'deposit' ? <CreditCard className="w-6 h-6" /> : <ShoppingCart className="w-6 h-6" />}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{tx.description}</p>
                                <p className="text-xs text-slate-400 font-medium">
                                  {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString() : 'Just now'}
                                </p>
                              </div>
                            </div>
                            <div className={cn(
                              "text-lg font-black",
                              tx.type === 'deposit' ? "text-green-500" : "text-red-500"
                            )}>
                              {tx.type === 'deposit' ? '+' : ''}{tx.amount.toLocaleString()}$
                            </div>
                          </div>
                        ))}
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
                                    if (!cartService.isInCart(course.id)) {
                                      cartService.addToCart(course.id);
                                      toast.success('Added to cart!');
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
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
