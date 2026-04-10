import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  X, 
  User, 
  Filter, 
  ChevronDown, 
  Star, 
  ShoppingCart as CartIcon,
  Check,
  Tag,
  ArrowLeft,
  Wrench,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useUserAuth } from './components/AuthContext';
import Logo from './components/ui/Logo';
import { cartService } from './services/cartService';
import { toolService } from './services/toolService';
import { settingsService, AppSettings } from './services/settingsService';
import { Tool } from './data/tools';
import { analyticsService } from './services/analyticsService';
import { walletService } from './services/walletService';
import { Toaster, toast } from 'sonner';
import { useCurrency } from './components/CurrencyContext';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default function Tools() {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartCount, setCartCount] = useState<number>(cartService.getCartCount());
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<Tool[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(settingsService.getDefaultSettings());
  const [visibleCount, setVisibleCount] = useState(25); // 5 columns * 5 rows = 25
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [fetchedSettings, fetchedTools] = await Promise.all([
        settingsService.getSettings(),
        toolService.getTools()
      ]);
      setSettings(fetchedSettings);
      setTools(fetchedTools);
      setIsLoading(false);
    };
    loadData();

    const handleCartUpdate = () => {
      setCartCount(cartService.getCartCount());
      updateCartItems();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    updateCartItems();

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, []);

  const updateCartItems = async () => {
    const allTools = await toolService.getTools();
    const cartItems = cartService.getCartItems();
    const items = cartItems
      .filter(item => item.type === 'tool')
      .map(item => allTools.find(t => t.id === item.id))
      .filter((t): t is Tool => !!t);
    setCartItems(items);
  };

  useEffect(() => {
    let result = [...tools];
    
    // Sort by featured status first
    const featuredIds = settings.featuredToolIds || [];
    result.sort((a, b) => {
      const aFeatured = featuredIds.includes(String(a.id));
      const bFeatured = featuredIds.includes(String(b.id));
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      return 0;
    });

    if (selectedCategory !== "All") {
      result = result.filter(t => t.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTools(result);
  }, [searchQuery, selectedCategory, tools, settings.featuredToolIds]);

  const categories = ["All", ...Array.from(new Set(tools.map(t => t.category)))];

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to purchase tools');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsPurchasing(true);
    try {
      const balance = await walletService.getBalance(user.uid);
      const total = cartItems.reduce((acc, item) => acc + item.price, 0);

      if (balance < total) {
        toast.error(`Insufficient balance. You need $${total.toFixed(2)} but have $${balance.toFixed(2)}`);
        setIsPurchasing(false);
        return;
      }

      for (const item of cartItems) {
        const result = await walletService.orderTool(user.uid, user.email || '', item.id, item.price, item.title);
        if (!result.success) {
          throw new Error(result.error || `Failed to order ${item.title}`);
        }
      }

      cartService.clearCart();
      setCartItems([]);
      setCartCount(0);
      setIsCartOpen(false);
      
      toast.success('Order submitted! Admin will review and provide account info soon.');
      navigate('/profile');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  const addToCart = (tool: Tool) => {
    if (cartService.isInCart(tool.id, 'tool')) {
      toast.error('Already in cart');
      window.dispatchEvent(new Event('open-cart'));
      return;
    }
    cartService.addToCart(tool.id, 'tool');
    toast.success('Added to cart');
    window.dispatchEvent(new Event('open-cart'));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="no-underline">
            <Logo size="md" className="md:hidden" />
            <Logo size="lg" className="hidden md:flex" />
          </Link>
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

            <div 
              className="relative cursor-pointer"
              onClick={() => window.dispatchEvent(new Event('open-cart'))}
            >
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FF6B35] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {cartCount}
                </span>
              )}
            </div>

            {user ? (
              <Link to="/profile" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-[#FF6B35] transition-all">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-slate-600" />
                )}
                <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">
                  {user.displayName?.split(' ')[0] || 'User'}
                </span>
              </Link>
            ) : (
              <Link 
                to="/login"
                className="bg-[#FF6B35] text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#7C3AED]" />
            <input 
              type="text" 
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-5 bg-white border-[3px] border-[#7C3AED] rounded-2xl focus:shadow-[6px_6px_0px_0px_rgba(124,58,237,0.3)] outline-none transition-all font-black text-lg md:text-xl shadow-[4px_4px_0px_0px_rgba(124,58,237,1)]"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar px-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-8 py-4 rounded-2xl font-black whitespace-nowrap transition-all border-[3px] uppercase tracking-widest text-sm md:text-base",
                  selectedCategory === cat 
                    ? "bg-[#7C3AED] text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#7C3AED] hover:text-[#7C3AED]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
              {filteredTools.slice(0, visibleCount).map((tool) => (
                <motion.div
                  key={tool.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-transparent overflow-hidden transition-all group flex flex-col cursor-pointer"
                  onClick={() => {
                    analyticsService.recordClick(tool.id, 'tool');
                    navigate(`/tool/${tool.id}`);
                  }}
                >
                  <div className="relative aspect-square overflow-hidden rounded-md mb-4 shadow-sm border border-slate-100 bg-white">
                    <img 
                      src={tool.image} 
                      alt={tool.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {tool.category && (
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {settings.featuredToolIds?.includes(String(tool.id)) && (
                          <span className="px-2 py-0.5 bg-[#FF6B35] text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">
                            Featured
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                          {tool.category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight line-clamp-2 leading-snug mb-1 group-hover:text-[#FF6B35] transition-colors">
                      {tool.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {formatPrice(tool.price)}
                      </span>
                      {tool.originalPrice > tool.price && (
                        <span className="text-xs text-slate-400 line-through font-medium">
                          {formatPrice(tool.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredTools.length > visibleCount && (
              <div className="flex justify-center mt-16">
                <button
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="px-12 py-4 bg-white border border-slate-200 rounded-xl font-bold uppercase tracking-widest text-slate-900 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all shadow-sm active:scale-95"
                >
                  See More
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && filteredTools.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">No tools found</h3>
            <p className="text-slate-500 font-medium">Try adjusting your search or filter to find what you're looking for.</p>
          </div>
        )}

        {/* Footer - Matching Screenshot */}
        <div className="mt-24 pt-12 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 pb-12">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-400">Powered by</span>
            <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Cheap</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
            <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>
        </div>
      </main>

      <Toaster position="top-center" />
    </div>
  );
}
