import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Star, 
  Check, 
  Shield, 
  Zap, 
  Clock, 
  Wrench, 
  ExternalLink, 
  Share2, 
  Heart,
  ChevronRight,
  MessageCircle,
  Play,
  FileText,
  Download,
  Info
} from 'lucide-react';
import { toolService } from './services/toolService';
import { Tool } from './data/tools';
import { Review } from './data/courses';
import { cartService } from './services/cartService';
import { wishlistService } from './services/wishlistService';
import { useUserAuth } from './components/AuthContext';
import { toast, Toaster } from 'sonner';
import Logo from './components/ui/Logo';
import CartDrawer from './components/CartDrawer';

const ToolDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [tool, setTool] = useState<Tool | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(cartService.getCartCount());
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchToolAndReviews = async () => {
      if (!slug) return;
      const tools = await toolService.getTools();
      const found = tools.find(t => String(t.id) === slug);
      if (found) {
        setTool(found);
        setIsWishlisted(wishlistService.isInWishlist(String(found.id)));
        const fetchedReviews = await toolService.getReviews(String(found.id));
        setReviews(fetchedReviews);
      } else {
        toast.error('Tool not found');
        navigate('/tools');
      }
      setIsLoading(false);
    };

    fetchToolAndReviews();

    const handleCartUpdate = () => setCartCount(cartService.getCartCount());
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [slug, navigate]);

  const handleAddToCart = () => {
    if (!tool) return;
    if (cartService.isInCart(tool.id, 'tool')) {
      toast.error('Already in cart');
      setIsCartOpen(true);
      return;
    }
    cartService.addToCart(tool.id, 'tool');
    toast.success('Added to cart');
    setIsCartOpen(true);
  };

  const handleWishlist = () => {
    if (!tool) return;
    if (isWishlisted) {
      wishlistService.removeFromWishlist(String(tool.id));
      setIsWishlisted(false);
      toast.success('Removed from wishlist');
    } else {
      wishlistService.addToWishlist(String(tool.id));
      setIsWishlisted(true);
      toast.success('Added to wishlist');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tool || !user) {
      toast.error('Please login to write a review');
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const result = await toolService.addReview({
        tool_id: String(tool.id),
        user_name: user.displayName || 'Anonymous',
        rating: newReview.rating,
        comment: newReview.comment,
        course_id: '' // Not a course review
      });

      if (result.error) throw result.error;

      toast.success('Review submitted successfully!');
      setNewReview({ rating: 5, comment: '' });
      
      // Refresh reviews
      const updatedReviews = await toolService.getReviews(String(tool.id));
      setReviews(updatedReviews);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tool) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tools" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <Link to="/" className="no-underline">
              <Logo size="md" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/tools" 
              className="bg-[#FFD700] text-black px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95 no-underline"
            >
              Buy Tools
            </Link>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-slate-600" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B35] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Media & Info */}
          <div className="lg:col-span-8 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100"
            >
              <div className="relative aspect-video bg-slate-900 group">
                <img 
                  src={tool.image} 
                  alt={tool.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div>
                    <span className="px-3 py-1 bg-[#FF6B35] text-black text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block">
                      {tool.category}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
                      {tool.title}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-4 h-4 fill-current", i >= Math.floor(tool.rating) && "text-slate-200")} />
                      ))}
                    </div>
                    <span className="text-sm font-black text-slate-900">{tool.rating}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">({tool.reviews} Reviews)</span>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Description</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-8">
                    {tool.description}
                  </p>

                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {[
                      "High-performance architecture",
                      "User-friendly interface",
                      "Regular security updates",
                      "24/7 technical support",
                      "Cross-platform compatibility",
                      "Detailed documentation included"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="bg-green-100 p-1 rounded-full">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Section */}
                <div className="mt-12 pt-12 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Customer Reviews</h3>
                      <p className="text-slate-500 text-sm font-medium">Share your experience with this tool</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{tool.rating}</div>
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("w-3 h-3 fill-current", i >= Math.floor(tool.rating) && "text-slate-200")} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] p-8 mb-8 border border-slate-100">
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Write a Review</h4>
                    <form className="space-y-4" onSubmit={handleSubmitReview}>
                      <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star} 
                            type="button"
                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                            className={cn(
                              "transition-colors",
                              star <= newReview.rating ? "text-yellow-400" : "text-slate-300 hover:text-yellow-400"
                            )}
                          >
                            <Star className="w-6 h-6 fill-current" />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        placeholder="What did you like or dislike? How was your experience?"
                        value={newReview.comment}
                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:border-[#FF6B35] outline-none transition-all font-medium min-h-[120px]"
                        required
                      />
                      <button 
                        type="submit"
                        disabled={isSubmittingReview}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#FF6B35] hover:text-black transition-all disabled:opacity-50"
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>

                  <div className="space-y-6">
                    {reviews.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                        <p className="text-slate-400 font-medium">No reviews yet. Be the first to review!</p>
                      </div>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 overflow-hidden">
                                <img 
                                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${review.user_name}`} 
                                  alt={review.user_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{review.user_name}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn("w-3 h-3 fill-current", i >= review.rating && "text-slate-200")} />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm font-medium leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Support & Community */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Safe & Secure</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  All our tools are thoroughly scanned for malware and vulnerabilities before being listed.
                </p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Instant Access</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Get immediate access to your tools after purchase review by our administration team.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Purchase Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[2.5rem] p-8 shadow-xl border-2 border-slate-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</span>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-black text-slate-900">${tool.price}</span>
                      {tool.originalPrice > tool.price && (
                        <span className="text-lg text-slate-400 line-through font-bold">${tool.originalPrice}</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-green-50 px-4 py-2 rounded-full border border-green-100">
                    <span className="text-xs font-black text-green-600 uppercase tracking-widest">
                      {Math.round((1 - tool.price / tool.originalPrice) * 100)}% OFF
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <button 
                    onClick={handleAddToCart}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-[#FF6B35] hover:text-black hover:shadow-[#FF6B35]/20 transition-all flex items-center justify-center gap-3 group"
                  >
                    <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    Add to Cart
                  </button>
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={handleWishlist}
                      className={cn(
                        "flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all border-2",
                        isWishlisted 
                          ? "bg-red-50 border-red-100 text-red-600" 
                          : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                      )}
                    >
                      <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
                      Wishlist
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">What's Included</h4>
                  <ul className="space-y-3">
                    {(tool.whatsIncluded || [
                      "Full Source Code Access",
                      "Lifetime Free Updates",
                      "Premium Support Channel",
                      "Installation Guide PDF",
                      "Video Tutorial Access",
                      "Commercial License"
                    ]).map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                        <Check className="w-4 h-4 text-[#FF6B35]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              {/* Need Help? */}
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <MessageCircle className="w-6 h-6 text-[#FF6B35]" />
                  </div>
                  <div>
                    <h4 className="font-black uppercase tracking-tight">Need Help?</h4>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest">Contact Support</p>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-6 font-medium">
                  Have questions about this tool? Our support team is here to help you 24/7.
                </p>
                <button 
                  onClick={() => navigate('/profile?tab=support')}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-black uppercase tracking-widest text-xs transition-all border border-white/10"
                >
                  Chat with Us
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <Toaster position="top-center" />
    </div>
  );
};

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default ToolDetail;
