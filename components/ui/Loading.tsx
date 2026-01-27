import React from 'react';
import { motion } from 'framer-motion';

interface LoadingProps {
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  type = 'spinner',
  size = 'md',
  color = 'primary',
  className
}) => {
  const sizes = {
    sm: { width: 16, height: 16, fontSize: 12 },
    md: { width: 24, height: 24, fontSize: 16 },
    lg: { width: 32, height: 32, fontSize: 20 }
  };

  const colors = {
    primary: 'rgb(99, 102, 241)',
    secondary: 'rgb(139, 92, 246)',
    success: 'rgb(34, 197, 94)',
    warning: 'rgb(245, 158, 11)',
    danger: 'rgb(239, 68, 68)'
  };

  const currentSize = sizes[size];
  const currentColor = colors[color];

  const renderSpinner = () => (
    <motion.div
      className="border-2 border-t-transparent rounded-full"
      style={{
        width: currentSize.width,
        height: currentSize.height,
        borderColor: currentColor,
        borderTopColor: 'transparent'
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );

  const renderDots = () => (
    <div className="flex gap-1" style={{ fontSize: currentSize.fontSize }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: currentColor }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <motion.div
      className="rounded-full"
      style={{
        width: currentSize.width,
        height: currentSize.height,
        backgroundColor: currentColor
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.8, 0.4, 0.8]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );

  const renderSkeleton = () => (
    <div className="loading-skeleton" style={{ width: currentSize.width * 4, height: currentSize.height }} />
  );

  const loaders = {
    spinner: renderSpinner,
    dots: renderDots,
    pulse: renderPulse,
    skeleton: renderSkeleton
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {loaders[type]()}
    </div>
  );
};

export default Loading;