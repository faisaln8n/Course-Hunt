import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUserAuth } from './components/AuthContext';
import Logo from './components/ui/Logo';
import { userService } from './services/userService';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Edit2, Save, X, Camera, LogOut, Heart, ShoppingCart, Trash2, Star, Target } from 'lucide-react';
import { wishlistService } from './services/wishlistService';
import { courseService } from './services/courseService';
import { Course } from './data/courses';
import { cartService } from './services/cartService';
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

    const handleWishlistUpdate = () => {
      loadWishlist();
    };

    const handleCartUpdate = () => {
      setCartCount(cartService.getCartCount());
    };

    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('cart-updated', handleCartUpdate);
    loadWishlist();

    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [profile]);

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
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="no-underline">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="relative p-2 text-slate-600 hover:text-[#FF6B35] transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
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

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Photo URL</label>
                      <input 
                        type="text"
                        value={editData.photoURL}
                        onChange={(e) => setEditData({...editData, photoURL: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all"
                        placeholder="https://example.com/photo.jpg"
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

              {/* Logout Section */}
              <section className="pt-6 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={async () => {
                    await logout();
                    navigate('/');
                    toast.success('Logged out successfully');
                  }}
                  className="flex items-center gap-2 px-8 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-95"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out from Account
                </button>
              </section>
            </div>
          </div>
        </motion.div>

        {/* Wishlist Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">My Wishlist</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {wishlistCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#FF6B35]/30 transition-all duration-500 group flex flex-col"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={course.image || ''} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <button 
                        onClick={() => wishlistService.toggleWishlist(String(course.id))}
                        className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-all duration-300 active:scale-90"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                          {course.category}
                        </span>
                        <div className="flex items-center gap-1 text-[#ffa534]">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs font-bold">{course.rating}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-4 line-clamp-2 group-hover:text-[#FF6B35] transition-colors duration-300 leading-tight">
                        {course.title}
                      </h3>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 line-through font-bold">{course.originalPrice}</span>
                          <span className="font-black text-xl text-[#FF6B35]">{course.price}</span>
                        </div>
                        <div className="flex gap-2">
                          <Link 
                            to={`/course/${course.id}`}
                            className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all active:scale-95"
                            title="View Details"
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
                            className={cn(
                              "p-3 rounded-xl transition-all active:scale-95 shadow-sm",
                              cartService.isInCart(course.id)
                                ? "bg-green-50 text-green-600 border border-green-100"
                                : "bg-[#FF6B35] text-black hover:shadow-md"
                            )}
                            title={cartService.isInCart(course.id) ? "In Cart" : "Add to Cart"}
                          >
                            <ShoppingCart className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
