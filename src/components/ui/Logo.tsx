import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'md', showText = true }) => {
  const sizes = {
    sm: { text: "text-xl", accent: "w-3 h-3", gap: "gap-0.5" },
    md: { text: "text-2xl", accent: "w-4 h-4", gap: "gap-1" },
    lg: { text: "text-3xl", accent: "w-5 h-5", gap: "gap-1.5" },
    xl: { text: "text-5xl", accent: "w-8 h-8", gap: "gap-2" },
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center ${currentSize.gap} group ${className} font-jakarta`}>
      <div className="flex items-center">
        <span className={`${currentSize.text} font-extrabold text-black tracking-tight`}>
          Course
        </span>
        <div className="relative flex items-center">
          <span className={`${currentSize.text} font-extrabold text-black tracking-tight`}>
            Hun
          </span>
          <div className="relative flex items-center">
            <span className={`${currentSize.text} font-extrabold text-black tracking-tight`}>
              t
            </span>
            {/* Stylized Accent - Similar to Inoflow checkmark */}
            <motion.div
              className={`absolute -right-1 -bottom-0.5 ${currentSize.accent} flex items-center justify-center`}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M4 12L9 17L20 6" 
                  stroke="#FF6B35" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </svg>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logo;
