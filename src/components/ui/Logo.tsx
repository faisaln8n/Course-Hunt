import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
  const sizes = {
    sm: { main: "text-base" },
    md: { main: "text-xl" },
    lg: { main: "text-3xl" },
    xl: { main: "text-5xl" },
  };

  const current = sizes[size];

  return (
    <div className={`flex items-center justify-center group ${className}`}>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center"
      >
        <span className={`${current.main} font-black tracking-tighter text-slate-900 uppercase leading-none flex items-center gap-[0.02em]`}>
          CH
          <span className="relative flex items-center justify-center mx-[0.05em]">
            <div className="bg-slate-900 rounded-full w-[2.1em] h-[0.95em] flex items-center px-[0.1em]">
              <motion.div 
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="bg-white rounded-full w-[0.75em] h-[0.75em] shadow-sm"
              />
            </div>
          </span>
          P
        </span>
      </motion.div>
    </div>
  );
};

export default Logo;
