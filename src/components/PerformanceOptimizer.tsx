'use client';

import { useEffect } from 'react';
import { startBackgroundOptimization } from '@/utils/performanceOptimizer';

export default function PerformanceOptimizer() {
  useEffect(() => {
    startBackgroundOptimization();
  }, []);

  return null; // This component doesn't render anything
} 