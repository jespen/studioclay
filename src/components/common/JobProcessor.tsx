'use client';

import { useEffect, useState } from 'react';

interface JobProcessorProps {
  paymentReference?: string;
}

/**
 * Silent component to process background jobs when mounted
 * Use this on confirmation pages to ensure jobs are processed in production
 */
const JobProcessor: React.FC<JobProcessorProps> = ({ paymentReference }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    // Only process jobs once
    if (isProcessing || !paymentReference) return;
    
    const processJobs = async () => {
      try {
        setIsProcessing(true);
        console.log('🔄 Silently processing jobs for payment', paymentReference);
        
        // Call the job processing endpoint
        const response = await fetch('/api/jobs/process');
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Job processing result:', result);
        } else {
          console.error('❌ Failed to process jobs:', response.statusText);
        }
      } catch (error) {
        console.error('❌ Error processing jobs:', error);
      }
    };
    
    // Add a small delay to ensure all data is saved first
    const timer = setTimeout(() => {
      processJobs();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [paymentReference, isProcessing]);
  
  // This component doesn't render anything
  return null;
};

export default JobProcessor; 