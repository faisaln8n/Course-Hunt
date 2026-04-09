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
  Info,
  Plus,
  Tag
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
  const [activeImage, setActiveImage] = useState(0);
  const [selectedBundle, setSelectedBundle] = useState(2); // Default to most popular

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

  const gallery = [tool.image, ...Array(4).fill(tool.image)]; // Mock gallery for demo

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tools" className="p-2 hover:bg-slate-50 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <Link to="/" className="no-underline">
              <Logo size="md" className="md:hidden" />
              <Logo size="lg" className="hidden md:flex" />
            </Link>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <Link 
              to="/tools" 
              className="hidden md:flex items-center bg-[#7C3AED] text-white rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold shadow-lg hover:bg-[#6D28D9] transition-all active:scale-95 no-underline overflow-hidden group"
            >
              <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-2">
                <div className="bg-white/20 p-0.5 md:p-1 rounded-md group-hover:bg-white/30 transition-colors">
                  <Plus className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" />
                </div>
                <span className="uppercase tracking-wider">Buy Tools</span>
              </div>
            </Link>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-slate-50 rounded-full transition-colors"
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

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Media */}
          <div className="space-y-6">
            <div className="aspect-square bg-[#A5E1F2] rounded-xl overflow-hidden relative group">
              <motion.img 
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={gallery[activeImage]} 
                alt={tool.title} 
                className="w-full h-full object-contain p-4" 
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Pagination Dots */}
            <div className="flex justify-center gap-2">
              {gallery.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    activeImage === idx ? "bg-slate-900 w-4" : "bg-slate-200 hover:bg-slate-400"
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2">
              {gallery.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    activeImage === idx ? "border-slate-900" : "border-slate-100 hover:border-slate-300"
                  )}
                >
                  <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">
                {tool.title}
              </h1>
              
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("w-4 h-4 fill-current", i >= Math.floor(tool.rating) && "text-slate-200")} />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-500">({tool.reviews})</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-[#E84C3D]">${tool.price} USD</span>
                {tool.originalPrice > tool.price && (
                  <span className="text-lg text-slate-400 line-through font-bold">${tool.originalPrice} USD</span>
                )}
                <span className="bg-[#E84C3D] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  SAVE {Math.round((1 - tool.price / tool.originalPrice) * 100)}%
                </span>
              </div>

              <p className="text-[10px] text-slate-500 font-medium">
                Pay in 4 interest-free installments for orders over $50.00 with <span className="text-indigo-600 font-bold">Shop Pay</span> <span className="underline cursor-pointer">Learn more</span>
              </p>

              <p className="text-slate-600 leading-relaxed text-sm font-medium whitespace-pre-wrap">
                {tool.description}
              </p>

              <div className="space-y-1 pt-2">
                {[
                  "Reduces Anxiety",
                  "Soft and huggable",
                  "Promotes better sleep"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span className="text-slate-900">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bundle & Save */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Bundle & Save!</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <div className="space-y-3">
                {[
                  { id: 1, label: "BUY 1 GET 40% OFF", price: tool.price, original: tool.originalPrice, shipping: "FREE SHIPPING" },
                  { id: 2, label: "BUY 2 GET 50% OFF", price: (tool.price * 1.8).toFixed(2), original: (tool.originalPrice * 2).toFixed(2), shipping: "FREE SHIPPING", popular: true },
                  { id: 3, label: "BUY 3 GET 60% OFF", price: (tool.price * 2.5).toFixed(2), original: (tool.originalPrice * 3).toFixed(2), shipping: "FREE SHIPPING" }
                ].map((bundle) => (
                  <div 
                    key={bundle.id}
                    onClick={() => setSelectedBundle(bundle.id)}
                    className={cn(
                      "relative p-4 rounded-xl border transition-all cursor-pointer",
                      selectedBundle === bundle.id 
                        ? "border-[#E84C3D] border-2 bg-orange-50/20" 
                        : "border-slate-200 bg-white hover:border-slate-300",
                      bundle.popular && "mt-4"
                    )}
                  >
                    {bundle.popular && (
                      <div className="absolute -top-3 right-4 bg-[#E84C3D] text-white text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest shadow-sm">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center",
                          selectedBundle === bundle.id ? "border-[#E84C3D]" : "border-slate-300"
                        )}>
                          {selectedBundle === bundle.id && <div className="w-2 h-2 rounded-full bg-[#E84C3D]" />}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{bundle.label}</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">+ {bundle.shipping}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">${bundle.price}</div>
                        <div className="text-[10px] font-bold text-slate-400 line-through">${bundle.original}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <img 
                  src="https://api.dicebear.com/7.x/notionists/svg?seed=Emily" 
                  alt="Emily" 
                  className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100" 
                />
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed">
                    "This plush toy has been a game-changer for my baby's sleep. Highly recommend!"
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-bold text-slate-400">Emily R.</span>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-current" />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button 
              onClick={handleAddToCart}
              className="w-full py-4 bg-[#E84C3D] text-white rounded-xl font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-100 hover:bg-black transition-all active:scale-95"
            >
              Add to Cart
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-20 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Customer Reviews</h2>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xl font-black text-slate-900">{tool.rating}</div>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("w-3 h-3 fill-current", i >= Math.floor(tool.rating) && "text-slate-200")} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 sticky top-24">
                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-4">Write a Review</h4>
                <form className="space-y-4" onSubmit={handleSubmitReview}>
                  <div className="flex gap-1.5 mb-2">
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
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="Share your experience..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#E84C3D] outline-none transition-all font-medium min-h-[100px] text-sm"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full py-3 bg-slate-900 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-[#E84C3D] transition-all disabled:opacity-50"
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              {reviews.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-400 font-medium italic text-sm">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 overflow-hidden border border-slate-200">
                          <img 
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${review.user_name}`} 
                            alt={review.user_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{review.user_name}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-2.5 h-2.5 fill-current", i >= review.rating && "text-slate-200")} />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs font-medium leading-relaxed italic">
                      "{review.comment}"
                    </p>
                  </div>
                ))
              )}
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
