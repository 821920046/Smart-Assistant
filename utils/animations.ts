import { Variants, Transition } from 'framer-motion';

// Optimized animation variants for better performance
export const optimizedVariants: Variants = {
  // Card animations with GPU acceleration
  card: {
    initial: { 
      opacity: 0, 
      scale: 0.9, 
      y: 20,
      rotateX: 10,
      willChange: 'transform, opacity'
    },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      rotateX: 0,
      willChange: 'auto',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        duration: 0.3
      }
    },
    hover: { 
      scale: 1.02,
      y: -4,
      rotateX: 0,
      willChange: 'transform',
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.2
      }
    },
    tap: { 
      scale: 0.98,
      y: 0,
      willChange: 'transform',
      transition: { duration: 0.1 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: -20,
      rotateX: -10,
      willChange: 'transform, opacity',
      transition: { duration: 0.2 }
    }
  },

  // List item animations
  listItem: {
    initial: { 
      opacity: 0, 
      x: -20,
      willChange: 'transform, opacity'
    },
    animate: { 
      opacity: 1, 
      x: 0,
      willChange: 'auto',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    exit: { 
      opacity: 0, 
      x: 20,
      willChange: 'transform, opacity',
      transition: { duration: 0.2 }
    }
  },

  // Modal animations
  modal: {
    initial: { 
      opacity: 0, 
      scale: 0.8,
      y: 40,
      willChange: 'transform, opacity'
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      willChange: 'auto',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: 40,
      willChange: 'transform, opacity',
      transition: { duration: 0.2 }
    }
  },

  // Toast notifications
  toast: {
    initial: { 
      opacity: 0, 
      y: -50,
      scale: 0.9,
      willChange: 'transform, opacity'
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      willChange: 'auto',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      y: -50,
      scale: 0.9,
      willChange: 'transform, opacity',
      transition: { duration: 0.2 }
    }
  },

  // Page transitions
  page: {
    initial: { 
      opacity: 0, 
      x: 20,
      y: 10,
      willChange: 'transform, opacity'
    },
    animate: { 
      opacity: 1, 
      x: 0,
      y: 0,
      willChange: 'auto',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      x: -20,
      y: -10,
      willChange: 'transform, opacity',
      transition: { duration: 0.2 }
    }
  }
};

// Optimized transition presets
export const optimizedTransitions: Record<string, Transition> = {
  // Fast spring for micro-interactions
  spring: {
    type: "spring" as const,
    stiffness: 400,
    damping: 20,
    duration: 0.2
  },

  // Smooth spring for larger movements
  smoothSpring: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
    duration: 0.3
  },

  // Quick tween for simple state changes
  quick: {
    type: "tween" as const,
    duration: 0.15,
    ease: "easeOut"
  },

  // Standard tween for most animations
  standard: {
    type: "tween" as const,
    duration: 0.2,
    ease: "easeOut"
  },

  // Slow tween for dramatic effects
  slow: {
    type: "tween" as const,
    duration: 0.3,
    ease: "easeInOut"
  }
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>();
  const renderCount = useRef(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;

    return () => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        
        // Log performance warnings in development
        if (process.env.NODE_ENV === 'development' && renderTime > 16) {
          console.warn(
            `⚠️ ${componentName} render took ${renderTime.toFixed(2)}ms ` +
            `(render #${renderCount.current})`
          );
        }
      }
    };
  });

  return {
    renderCount: renderCount.current
  };
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([]);
  const observer = useRef<IntersectionObserver>();

  const observe = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.observe(element);
    }
  }, []);

  const unobserve = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.unobserve(element);
    }
  }, []);

  useEffect(() => {
    observer.current = new IntersectionObserver(setEntries, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [options]);

  return { entries, observe, unobserve };
};