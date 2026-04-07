import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  };

  const currentSize = textSizes[size];

  return (
    <div className={`flex items-center group ${className}`}>
      <motion.span 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${currentSize} font-black tracking-tighter uppercase flex items-center gap-1`}
      >
        <span className="text-slate-900">Owl's</span>
        <span className="text-[#FF6B35]">Club</span>
        <span className="text-[#6907f7]">.</span>
      </motion.span>
    </div>
  );
};

export default Logo;
