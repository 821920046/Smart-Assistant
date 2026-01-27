import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  variant = 'default',
  size = 'md',
  className,
  ...props
}, ref) => {
  const baseClasses = 'w-full transition-all duration-200 focus-ring';
  
  const variants = {
    default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400',
    filled: 'bg-slate-50 dark:bg-slate-900 border-0 focus:bg-white dark:focus:bg-slate-800',
    outlined: 'bg-transparent border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-base rounded-xl',
    lg: 'px-5 py-3 text-lg rounded-2xl'
  };

  const inputVariants = {
    rest: { scale: 1 },
    focus: { scale: 1.01 }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        
        <motion.input
          ref={ref}
          className={cn(
            baseClasses,
            variants[variant],
            sizes[size],
            icon && 'pl-11',
            error && 'border-rose-500 focus:border-rose-500',
            className
          )}
          variants={inputVariants}
          whileFocus="focus"
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          {...props}
        />
      </div>
      
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          error ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;