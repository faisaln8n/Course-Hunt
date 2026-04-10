"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, Star, ShoppingCart, Plus, Check, Tag, Trash2, Filter, ChevronDown, User, LogOut, Heart, Target, Megaphone, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsService } from './services/analyticsService';
import { cartService } from './services/cartService';
import { wishlistService } from './services/wishlistService';
import { courseService } from './services/courseService';
import { walletService } from './services/walletService';
import { Course } from './data/courses';
import { settingsService, AppSettings, Coupon } from './services/settingsService';
import { Toaster, toast } from 'sonner';
import { useUserAuth } from './components/AuthContext';
import Logo from './components/ui/Logo';
import LoadingScreen from './components/ui/LoadingScreen';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface Dot {
  x: number;
  y: number;
  baseColor: string;
  targetOpacity: number;
  currentOpacity: number;
  opacitySpeed: number;
  baseRadius: number;
  currentRadius: number;
}

const TypingText = ({ texts, speed = 150, delay = 2000 }: { texts: string[], speed?: number, delay?: number }) => {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[index];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentText.substring(0, displayText.length + 1));
        if (displayText.length === currentText.length) {
          setTimeout(() => setIsDeleting(true), delay);
        }
      } else {
        setDisplayText(currentText.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, index, texts, speed, delay]);

  return (
    <span className="inline-block min-w-[1ch]">
      <span className="bg-gradient-to-r from-[#FF6B35] to-[#E85D04] bg-clip-text text-transparent">
        {displayText}
      </span>
      <motion.span
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-[3px] h-[0.8em] bg-[#FF6B35] ml-1 align-middle"
      />
    </span>
  );
};

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  const TimerBox = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center bg-white/20 backdrop-blur-md rounded-md p-0.5 md:p-1.5 min-w-[28px] md:min-w-[42px] border border-white/10 md:border-white/20 shadow-sm">
      <span className="text-[9px] md:text-lg font-black leading-none text-white">{String(value).padStart(2, '0')}</span>
      <span className="text-[5px] md:text-[9px] uppercase font-bold text-white/80 mt-0.5">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-0.5 md:gap-2">
      <TimerBox value={timeLeft.days} label="Days" />
      <span className="text-white/50 font-bold text-[8px] md:text-base">:</span>
      <TimerBox value={timeLeft.hours} label="Hrs" />
      <span className="text-white/50 font-bold text-[8px] md:text-base">:</span>
      <TimerBox value={timeLeft.minutes} label="Min" />
      <span className="text-white/50 font-bold text-[8px] md:text-base">:</span>
      <TimerBox value={timeLeft.seconds} label="Sec" />
    </div>
  );
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const { user, profile, logout } = useUserAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [extraFilter, setExtraFilter] = useState<string>("All");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [cartCount, setCartCount] = useState<number>(cartService.getCartCount());
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(settingsService.getDefaultSettings());
  const [cartItems, setCartItems] = useState<Course[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const dotsRef = useRef<Dot[]>([]);
  const gridRef = useRef<Record<string, number[]>>({});
  const canvasSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const mousePositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const DOT_SPACING = 25;
  const BASE_OPACITY_MIN = 0.5;
  const BASE_OPACITY_MAX = 0.75;
  const BASE_RADIUS = 1.5;
  const INTERACTION_RADIUS = 150;
  const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;
  const OPACITY_BOOST = 0.8;
  const RADIUS_BOOST = 3.5;
  const GRID_CELL_SIZE = Math.max(50, Math.floor(INTERACTION_RADIUS / 1.5));

  const handleMouseMove = (event: globalThis.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      mousePositionRef.current = { x: null, y: null };
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    mousePositionRef.current = { x: canvasX, y: canvasY };
  };

  const createDots = () => {
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    const newDots: Dot[] = [];
    const newGrid: Record<string, number[]> = {};
    const cols = Math.ceil(width / DOT_SPACING);
    const rows = Math.ceil(height / DOT_SPACING);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * DOT_SPACING + DOT_SPACING / 2;
        const y = j * DOT_SPACING + DOT_SPACING / 2;
        const cellX = Math.floor(x / GRID_CELL_SIZE);
        const cellY = Math.floor(y / GRID_CELL_SIZE);
        const cellKey = `${cellX}_${cellY}`;

        if (!newGrid[cellKey]) {
          newGrid[cellKey] = [];
        }

        const dotIndex = newDots.length;
        newGrid[cellKey].push(dotIndex);

        const baseOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
        newDots.push({
          x,
          y,
          baseColor: `rgba(212, 175, 55, ${BASE_OPACITY_MAX})`,
          targetOpacity: baseOpacity,
          currentOpacity: baseOpacity,
          opacitySpeed: (Math.random() * 0.005) + 0.002,
          baseRadius: BASE_RADIUS,
          currentRadius: BASE_RADIUS,
        });
      }
    }
    dotsRef.current = newDots;
    gridRef.current = newGrid;
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;

    if (canvas.width !== width || canvas.height !== height ||
      canvasSizeRef.current.width !== width || canvasSizeRef.current.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvasSizeRef.current = { width, height };
      createDots();
    }
  };

  const animateDots = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const dots = dotsRef.current;
    const grid = gridRef.current;
    const { width, height } = canvasSizeRef.current;
    const { x: mouseX, y: mouseY } = mousePositionRef.current;

    if (!ctx || !dots || !grid || width === 0 || height === 0) {
      animationFrameId.current = requestAnimationFrame(animateDots);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // Draw 3D Perspective Grid
    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
      ctx.lineWidth = 1;

      const horizon = height * 0.35;
      const gridSpacing = 70;
      const perspective = 0.8;

      // Horizontal lines (perspective)
      for (let i = 0; i < 20; i++) {
        const y = horizon + Math.pow(i / 20, 2) * (height - horizon);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical lines (converging at horizon)
      const centerX = width / 2;
      for (let i = -10; i <= 10; i++) {
        const xAtBottom = centerX + i * gridSpacing * 4;
        ctx.beginPath();
        ctx.moveTo(centerX + i * gridSpacing * 0.2, horizon);
        ctx.lineTo(xAtBottom, height);
        ctx.stroke();
      }
    };

    drawGrid();

    const activeDotIndices = new Set<number>();
    if (mouseX !== null && mouseY !== null) {
      const mouseCellX = Math.floor(mouseX / GRID_CELL_SIZE);
      const mouseCellY = Math.floor(mouseY / GRID_CELL_SIZE);
      const searchRadius = Math.ceil(INTERACTION_RADIUS / GRID_CELL_SIZE);
      for (let i = -searchRadius; i <= searchRadius; i++) {
        for (let j = -searchRadius; j <= searchRadius; j++) {
          const checkCellX = mouseCellX + i;
          const checkCellY = mouseCellY + j;
          const cellKey = `${checkCellX}_${checkCellY}`;
          if (grid[cellKey]) {
            grid[cellKey].forEach(dotIndex => activeDotIndices.add(dotIndex));
          }
        }
      }
    }

    dots.forEach((dot, index) => {
      dot.currentOpacity += dot.opacitySpeed;
      if (dot.currentOpacity >= dot.targetOpacity || dot.currentOpacity <= BASE_OPACITY_MIN) {
        dot.opacitySpeed = -dot.opacitySpeed;
        dot.currentOpacity = Math.max(BASE_OPACITY_MIN, Math.min(dot.currentOpacity, BASE_OPACITY_MAX));
        dot.targetOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
      }

      let interactionFactor = 0;
      dot.currentRadius = dot.baseRadius;

      if (mouseX !== null && mouseY !== null && activeDotIndices.has(index)) {
        const dx = dot.x - mouseX;
        const dy = dot.y - mouseY;
        const distSq = dx * dx + dy * dy;

        if (distSq < INTERACTION_RADIUS_SQ) {
          const distance = Math.sqrt(distSq);
          interactionFactor = Math.max(0, 1 - distance / INTERACTION_RADIUS);
          interactionFactor = interactionFactor * interactionFactor;
        }
      }

      const finalOpacity = Math.min(1, dot.currentOpacity + interactionFactor * OPACITY_BOOST);
      dot.currentRadius = dot.baseRadius + interactionFactor * RADIUS_BOOST;

      ctx.beginPath();
      ctx.fillStyle = `rgba(212, 175, 55, ${finalOpacity.toFixed(3)})`;
      ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    animationFrameId.current = requestAnimationFrame(animateDots);
  };

  useEffect(() => {
    handleResize();
    const handleMouseLeave = () => {
      mousePositionRef.current = { x: null, y: null };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    animationFrameId.current = requestAnimationFrame(animateDots);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      // 1. Use the optimized getCourses and getSettings with internal caching
      const [coursesResult, fetchedSettings] = await Promise.all([
        courseService.getCourses(),
        settingsService.getSettings()
      ]);
      
      setCourses(coursesResult.courses);
      setLastDoc(coursesResult.lastDoc);
      setHasMore(!!coursesResult.lastDoc);
      setSettings(fetchedSettings);
      setCartCount(cartService.getCartCount());
      
      const cartItems = cartService.getCartItems();
      const items = cartItems
        .filter(item => item.type === 'course')
        .map(item => coursesResult.courses.find(c => c.id === item.id))
        .filter((c): c is Course => !!c);
      setCartItems(items);
      setIsLoading(false);
    };

    const handleCartUpdate = async () => {
      setCartCount(cartService.getCartCount());
      const cartItems = cartService.getCartItems();
      const allCourses = await courseService.getAllCoursesRaw();
      const items = cartItems
        .filter(item => item.type === 'course')
        .map(item => allCourses.find(c => c.id === item.id))
        .filter((c): c is Course => !!c);
      setCartItems(items);
    };

    const handleWishlistUpdate = () => {
      setWishlistItems(wishlistService.getWishlistItems());
    };
    
    const handleCoursesUpdate = async () => {
      const result = await courseService.getCourses();
      setCourses(result.courses);
    };

    const handleSettingsUpdate = async () => {
      const fetchedSettings = await settingsService.getSettings();
      setSettings(fetchedSettings);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('courses-updated', handleCoursesUpdate);
    window.addEventListener('settings-updated', handleSettingsUpdate);
    
    loadInitialData();
    handleWishlistUpdate();
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('courses-updated', handleCoursesUpdate);
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, [user]);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to purchase courses');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const subtotal = cartItems.reduce((acc, item) => acc + Number(item.price.replace('$', '')), 0);
    const discount = appliedCoupon ? (
      appliedCoupon.courseId 
        ? (Number(cartItems.find(item => String(item.id) === appliedCoupon.courseId)?.price.replace('$', '') || 0) * appliedCoupon.discount / 100)
        : (subtotal * appliedCoupon.discount) / 100
    ) : 0;
    const total = subtotal - discount;

    if ((profile?.walletBalance || 0) < total) {
      toast.error(`Insufficient balance. You need $${total.toFixed(2)} but have $${(profile?.walletBalance || 0).toFixed(2)}`);
      return;
    }

    if (!window.confirm(`Are you sure you want to purchase ${cartItems.length} courses for $${total.toFixed(2)}?`)) {
      return;
    }

    setIsPurchasing(true);
    try {
      // Purchase each course
      for (const item of cartItems) {
        // Calculate individual price if coupon applies
        let itemPrice = Number(item.price.replace('$', ''));
        if (appliedCoupon) {
          if (!appliedCoupon.courseId || String(item.id) === appliedCoupon.courseId) {
            itemPrice = itemPrice * (1 - appliedCoupon.discount / 100);
          }
        }

        const result = await walletService.purchaseCourse(
          user.uid,
          String(item.id),
          itemPrice,
          item.title
        );

        if (result.error) {
          throw new Error(result.error);
        }
      }

      await cartService.clearCart();
      setCartItems([]);
      setAppliedCoupon(null);
      setCouponCode('');
      setIsCartOpen(false);
      toast.success('Purchase successful! You can now access your courses in your profile.');
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  const parsePrice = (priceStr: string) => {
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };

  const loadMoreCourses = async () => {
    if (isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);
    try {
      const result = await courseService.getCourses(lastDoc);
      setCourses(prev => [...prev, ...result.courses]);
      setLastDoc(result.lastDoc);
      setHasMore(!!result.lastDoc);
    } catch (error) {
      console.error('Error loading more courses:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesExtra = true;
    if (extraFilter === "Popular") matchesExtra = course.additionalChoices === "Popular";
    else if (extraFilter === "New") matchesExtra = course.additionalChoices === "New";
    
    return matchesCategory && matchesSearch && matchesExtra;
  });

  if (extraFilter === "Price: Low to High") {
    filteredCourses.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  } else if (extraFilter === "Price: High to Low") {
    filteredCourses.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
  }

  const ITEMS_PER_PAGE = typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 16;
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const currentCourses = filteredCourses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen />}
      </AnimatePresence>
      <div className="min-h-screen bg-white text-gray-900 relative overflow-x-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-100" />
      <div className="absolute inset-0 z-1 pointer-events-none bg-gradient-to-b from-white/5 via-white/30 to-white/90" />
      
      {/* Announcement Bar */}
      {settings.announcement && isBannerVisible && (
        <div className="relative z-40 bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white py-2 md:py-2 px-1 md:px-10 flex items-center justify-center overflow-hidden shadow-2xl border-b border-white/10">
          <div className="flex items-center justify-center gap-1 md:gap-6 max-w-full pr-7 md:pr-0 overflow-hidden flex-nowrap">
            {settings.announcementLink ? (
              <a 
                href={settings.announcementLink.startsWith('http') || settings.announcementLink.startsWith('/') ? settings.announcementLink : `https://${settings.announcementLink}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 md:gap-6 hover:opacity-90 transition-opacity no-underline flex-nowrap"
              >
                <motion.div
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex items-center gap-1.5 md:gap-3 shrink-0"
                >
                  <div className="bg-white/20 p-1 md:p-2 rounded-full backdrop-blur-sm">
                    <Megaphone className="w-3 h-3 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="font-mono text-[10px] md:text-[15px] text-[#6907f7] bg-[#ebf4f5] rounded-[4px] md:rounded-[5px] font-bold px-1 md:px-2 py-0.5 border border-white/10 whitespace-nowrap shadow-sm">
                    {settings.announcement}
                  </span>
                </motion.div>
                
                {settings.announcementCountdown && (
                  <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    <div className="hidden md:block h-4 md:h-8 w-[1px] bg-white/20" />
                    <CountdownTimer targetDate={settings.announcementCountdown} />
                  </div>
                )}
                
                <div className="bg-white text-[#dc2743] px-1.5 md:px-6 py-1 md:py-1.5 rounded-md md:rounded-xl text-[9px] md:text-sm font-black flex items-center gap-0.5 md:gap-2 shadow-lg whitespace-nowrap shrink-0">
                  <span className="hidden xs:inline">Learn More</span>
                  <span className="xs:hidden">Join</span>
                  <ChevronRight className="w-2.5 h-2.5 md:w-4 md:h-4" />
                </div>
              </a>
            ) : (
              <div className="flex items-center justify-center gap-1.5 md:gap-6 flex-nowrap">
                <motion.div
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex items-center gap-1.5 md:gap-3 shrink-0"
                >
                  <div className="bg-white/20 p-1 md:p-2 rounded-full backdrop-blur-sm">
                    <Megaphone className="w-3 h-3 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="font-mono text-[10px] md:text-[15px] text-[#6907f7] bg-[#ebf4f5] rounded-[4px] md:rounded-[5px] font-bold px-1 md:px-2 py-0.5 border border-white/10 whitespace-nowrap shadow-sm">
                    {settings.announcement}
                  </span>
                </motion.div>
                
                {settings.announcementCountdown && (
                  <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    <div className="hidden md:block h-4 md:h-8 w-[1px] bg-white/20" />
                    <CountdownTimer targetDate={settings.announcementCountdown} />
                  </div>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsBannerVisible(false)}
            className="absolute right-0.5 md:right-4 p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-50"
            aria-label="Close announcement"
          >
            <X className="w-3.5 h-3.5 md:w-5 md:h-5 opacity-70 hover:opacity-100 text-white" />
          </button>
        </div>
      )}

      <motion.header
        initial={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
        animate={{
          backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.98)" : "rgba(255, 255, 255, 0.8)",
          boxShadow: isScrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
          top: 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="sticky w-full z-30 backdrop-blur-md border-b border-gray-200"
      >
        <nav className="container mx-auto px-4 md:px-6 lg:px-8 flex justify-between items-center h-16">
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

            <div className="hidden md:flex items-center space-x-4 md:space-x-6">
              <motion.div 
                className="relative cursor-pointer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => window.dispatchEvent(new Event('open-cart'))}
              >
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {cartCount >= 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF6B35] text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {cartCount}
                  </span>
                )}
              </motion.div>

              {user ? (
                <div className="flex items-center gap-4">
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
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    to="/login"
                    className="bg-[#FF6B35] text-black px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          <motion.button
            className="md:hidden text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 overflow-hidden"
            >
              <motion.div 
                className="container mx-auto px-4 py-4 flex flex-col space-y-4"
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  open: {
                    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
                  },
                  closed: {
                    transition: { staggerChildren: 0.05, staggerDirection: -1 }
                  }
                }}
              >
                <Link 
                  to="/tools"
                  className="flex items-center justify-center gap-3 bg-[#7C3AED] text-white px-8 py-4 rounded-xl text-center text-lg font-black uppercase tracking-widest shadow-md active:scale-95 no-underline group"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="bg-white/20 p-1.5 rounded-md group-hover:bg-white/30 transition-colors">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <span>Buy Tools</span>
                </Link>
                <div 
                  className="flex items-center justify-center space-x-2 py-2 cursor-pointer"
                  onClick={() => {
                    setIsCartOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  <span className="text-gray-700 font-medium">Cart ({cartCount})</span>
                </div>

                {user ? (
                  <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-100">
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 hover:border-[#FF6B35] transition-all">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                      ) : (
                        <User className="w-5 h-5 text-slate-600" />
                      )}
                      <span className="text-sm font-bold text-slate-700">
                        {user.displayName || 'User'}
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                    <Link 
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-center bg-[#FF6B35] text-black py-3 rounded-2xl font-bold shadow-sm"
                    >
                      Login
                    </Link>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="relative z-10 pt-8 md:pt-12 pb-16">
        <section className="container mx-auto px-4 md:px-6 lg:px-8 text-center mb-16 relative">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-gradient-to-b from-[#FF6B35]/5 to-transparent blur-3xl -z-10 pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-10"
          >
            <h1 className="text-[24px] sm:text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-4 tracking-tighter leading-none flex items-center justify-center gap-x-2 whitespace-nowrap">
              <span className="relative inline-block">
                <span className="absolute -left-3 -top-1 text-[#FF6B35]/20 text-3xl md:text-6xl font-serif">"</span>
                Global Cheapest
              </span>
              <TypingText texts={["Courses", "Tools", "Skills"]} />
              <span className="relative inline-block">
                <span className="absolute -right-3 -bottom-1 text-[#FF6B35]/20 text-3xl md:text-6xl font-serif">"</span>
              </span>
            </h1>
            <p className="text-gray-500 text-[10px] md:text-lg font-bold uppercase tracking-[0.2em] mt-6">
              Your Ultimate Chance to Buy Premium Assets at Global Low Prices
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="max-w-2xl mx-auto mb-12 relative group"
          >
            {/* Animated glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FF6B35] to-[#7C3AED] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            
            <motion.div 
              className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
              whileFocus="focused"
            >
              <div className="flex items-center px-5">
                <motion.div
                  animate={{
                    rotate: searchQuery ? [0, 10, -10, 0] : 0
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <Search className="text-[#FF6B35] w-6 h-6 shrink-0" />
                </motion.div>
                <input
                  type="text"
                  placeholder="Search for tools, courses, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-4 py-4 md:py-6 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none font-bold text-base md:text-xl"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
            className="flex flex-wrap justify-center gap-2 md:gap-4 items-center max-w-5xl mx-auto"
          >
            {(() => {
              const allCats = ["All", ...settings.categories];
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
              const limit = 5;
              const hasMore = allCats.length > limit;
              const displayedCats = (isMobile && !showAllCategories && hasMore) 
                ? allCats.slice(0, limit) 
                : allCats;

              return (
                <>
                  {displayedCats.map((category, index) => (
                    <motion.button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.05, type: "spring", stiffness: 300 }}
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "px-5 md:px-7 py-2.5 md:py-3.5 rounded-2xl text-xs md:text-base font-black transition-all shadow-sm whitespace-nowrap border-2",
                        selectedCategory === category
                          ? "bg-gradient-to-r from-[#FF6B35] to-[#E85D04] text-white border-transparent shadow-lg shadow-orange-200"
                          : "bg-white text-gray-600 hover:text-[#FF6B35] border-gray-100 hover:border-[#FF6B35] hover:shadow-md"
                      )}
                    >
                      {category}
                    </motion.button>
                  ))}
                  
                  {isMobile && hasMore && !showAllCategories && (
                    <motion.button
                      onClick={() => setShowAllCategories(true)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + limit * 0.05, type: "spring", stiffness: 300 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-5 py-2.5 rounded-2xl text-xs font-black bg-slate-50 text-[#FF6B35] border-2 border-slate-100 hover:border-[#FF6B35] transition-all shadow-sm whitespace-nowrap"
                    >
                      See More
                    </motion.button>
                  )}

                  {isMobile && showAllCategories && (
                    <motion.button
                      onClick={() => setShowAllCategories(false)}
                      className="px-5 py-2.5 rounded-2xl text-xs font-black bg-slate-50 text-gray-500 border-2 border-slate-100 transition-all shadow-sm whitespace-nowrap"
                    >
                      Show Less
                    </motion.button>
                  )}
                </>
              );
            })()}

            <div className="relative" ref={filterRef}>
              <motion.button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm border-2",
                  extraFilter !== "All"
                    ? "bg-[#FF6B35] text-black border-[#FF6B35] shadow-md"
                    : "bg-white text-gray-700 border-gray-300 hover:border-[#FF6B35]"
                )}
              >
                <Filter className="w-4 h-4" />
                <span>{extraFilter === "All" ? "Filter" : extraFilter}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", isFilterOpen && "rotate-180")} />
              </motion.button>

              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    {[
                      "All", 
                      "Popular", 
                      "New", 
                      "Price: Low to High", 
                      "Price: High to Low"
                    ].map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setExtraFilter(option);
                          setIsFilterOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50",
                          extraFilter === option ? "bg-gray-50 text-[#FF6B35] font-bold" : "text-gray-700"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </section>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-6">
            {currentCourses.map((course, index) => {
              const slug = course.title
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
              
              return (
                <Link 
                  to={`/course/${slug}`} 
                  key={course.id}
                  onClick={async () => {
                    await analyticsService.recordClick(course.id);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -5 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.08,
                      ease: "easeOut"
                    }}
                    className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#FF6B35]/30 transition-all duration-300 cursor-pointer h-full flex flex-col group"
                  >
                    <div className="relative h-48 md:h-48 overflow-hidden">
                      <img
                        src={course.image || null}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${course.id}/800/600`;
                        }}
                      />
                      {course.additionalChoices === 'Popular' && (
                        <motion.div 
                          className="absolute top-0 left-0 bg-[#FFD700] text-black px-4 py-2 text-xs md:text-sm font-black shadow-lg uppercase tracking-widest z-10 border-b border-r border-[#DAA520]"
                          initial={{ x: -100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.08, type: "spring", stiffness: 100 }}
                        >
                          Popular
                        </motion.div>
                      )}
                      {course.additionalChoices === 'New' && (
                        <motion.div 
                          className="absolute top-0 left-0 bg-[#86EFAC] text-black px-4 py-2 text-xs md:text-sm font-black shadow-lg uppercase tracking-widest z-10 border-b border-r border-[#4ADE80]"
                          initial={{ x: -100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.08, type: "spring", stiffness: 100 }}
                        >
                          New
                        </motion.div>
                      )}
                      {course.additionalChoices === 'Premium' && (
                        <motion.div 
                          className="absolute top-0 left-0 bg-gradient-to-r from-[#0a0a0a] to-[#2a2a2a] text-[#FFD700] px-4 py-2 text-xs md:text-sm font-black shadow-xl uppercase tracking-widest z-10 border-b border-r border-[#FFD700]/30"
                          initial={{ x: -100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.08, type: "spring", stiffness: 100 }}
                        >
                          Premium
                        </motion.div>
                      )}
                    </div>
                    <div className="p-3 md:p-5 flex-1 flex flex-col">
                      <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-1 md:mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <div className="flex items-center mb-3 md:mb-3">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.6 + index * 0.08 + i * 0.05, type: "spring", stiffness: 200 }}
                            >
                              <Star
                                className={cn(
                                  "w-3 h-3 md:w-4 md:h-4",
                                  i < course.rating ? "fill-[#ffa534] text-[#ffa534]" : "fill-gray-300 text-gray-300"
                                )}
                              />
                            </motion.div>
                          ))}
                        </div>
                        <span className="text-[10px] md:text-sm text-gray-500 ml-1 md:ml-2">({course.reviews})</span>
                      </div>
                      
                      <div className="mt-auto space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-400 line-through font-medium leading-none mb-1">{course.originalPrice}</span>
                            <motion.span 
                              className="text-2xl md:text-3xl font-black text-[#FF6B35] leading-none"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.7 + index * 0.08 }}
                            >{course.price}</motion.span>
                          </div>
                          {(() => {
                            const p = parseFloat(course.price.replace(/[^0-9.]/g, ''));
                            const op = parseFloat(course.originalPrice.replace(/[^0-9.]/g, ''));
                            if (op > p) {
                              const discount = Math.round(((op - p) / op) * 100);
                              return (
                                <div className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
                                  Save {discount}%
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (cartService.isInCart(course.id, 'course')) {
                                window.dispatchEvent(new Event('open-cart'));
                                return;
                              }
                              cartService.addToCart(course.id, 'course');
                              toast.success('Added to cart');
                              window.dispatchEvent(new Event('open-cart'));
                            }}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 h-12 md:h-12 rounded-xl font-black transition-all shadow-sm text-sm uppercase tracking-wider border-2",
                              cartService.isInCart(course.id, 'course') 
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-default" 
                                : "bg-[#FF6B35] text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                            )}
                          >
                            {cartService.isInCart(course.id, 'course') ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>In Cart</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              wishlistService.toggleWishlist(String(course.id));
                            }}
                            className={cn(
                              "w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all duration-300 shrink-0",
                              wishlistItems.includes(String(course.id))
                                ? "bg-red-50 border-red-200 text-red-500 shadow-inner"
                                : "bg-white border-black text-gray-400 hover:text-red-500 hover:border-red-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                            )}
                          >
                            <Heart className={cn("w-5 h-5", wishlistItems.includes(String(course.id)) && "fill-current")} />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center items-center flex-wrap gap-3 mt-12 mb-20">
              <button
                onClick={loadMoreCourses}
                disabled={isLoadingMore}
                className="px-12 py-4 rounded-xl bg-[#FF6B35] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-30 disabled:shadow-none disabled:translate-y-0 transition-all font-black text-sm uppercase tracking-widest active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                {isLoadingMore ? 'Loading...' : 'Load More Courses'}
              </button>
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 mb-16">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Why Choose course-hunt?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Expert Instructors",
                description: "Learn from industry professionals with years of experience",
                icon: "👨‍🏫"
              },
              {
                title: "Flexible Learning",
                description: "Study at your own pace, anytime and anywhere",
                icon: "⏰"
              },
              {
                title: "Lifetime Access",
                description: "Get unlimited access to all course materials forever",
                icon: "♾️"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-center shadow-md cursor-pointer"
              >
                <div className="text-6xl mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 mb-16">
          <motion.div 
            className="bg-gradient-to-r from-[#FF6B35]/15 to-[#FF6B35]/5 border-2 border-[#FF6B35]/30 rounded-3xl p-8 md:p-12 text-center shadow-xl"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Ready to Start Learning?
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {"Join thousands of students already learning on course-hunt"}
            </motion.p>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              whileHover={{ 
                scale: 1.08, 
                boxShadow: "0 20px 40px -10px rgba(212, 175, 55, 0.5)",
                y: -3
              }}
              whileTap={{ scale: 0.98 }}
              className="bg-[#FF6B35] text-black px-10 py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-colors shadow-lg"
            >
              Get Started Free
            </motion.button>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t-2 border-gray-200 bg-white/90 backdrop-blur-md py-10">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <motion.p 
              className="text-gray-600 font-medium"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >© 2023 course-hunt. All rights reserved.</motion.p>
            <Link 
              to="/admin" 
              className="text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-[#FF6B35]"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      </footer>
    </div>
    <Toaster position="top-center" />
    </>
  );
}
