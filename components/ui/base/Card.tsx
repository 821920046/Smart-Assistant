import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'outlined';
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  interactive = false,
  className,
  onClick,
  ...props
}) => {
  const baseClasses = 'rounded-xl transition-all duration-200';
  
  const variants = {
    default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm',
    elevated: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl',
    glass: 'glass-card hover:border-slate-300 dark:hover:border-slate-600',
    outlined: 'bg-transparent border-2 border-slate-200 dark:border-slate-700'
  };
  
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const cardVariants = {
    rest: { 
      scale: 1, 
      y: 0,
      boxShadow: 'var(--shadow-sm)'
    },
    hover: { 
      scale: hover ? 1.02 : 1, 
      y: hover ? -4 : 0,
      boxShadow: hover ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
    },
    tap: { 
      scale: 0.98, 
      y: 0 
    }
  };

  const Component = motion.div;
  
  return (
    <Component
      className={cn(
        baseClasses,
        variants[variant],
        paddings[padding],
        (hover || interactive) && 'cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-700',
        interactive && 'active-scale',
        className
      )}
      variants={cardVariants}
      initial="rest"
      whileHover={hover || interactive ? "hover" : "rest"}
      whileTap={interactive ? "tap" : "rest"}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      {...props}
    >
      {/* Hover gradient overlay */}
      {(hover || interactive) && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </Component>
  );
};

export default Card;