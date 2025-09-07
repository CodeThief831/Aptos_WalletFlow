import { useState, useEffect } from 'react';

const useRazorpay = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRazorpay = () => {
      if (typeof window.Razorpay !== 'undefined') {
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }

      // If not loaded, wait a bit and check again
      setTimeout(() => {
        if (typeof window.Razorpay !== 'undefined') {
          setIsLoaded(true);
        } else {
          setIsLoaded(false);
        }
        setIsLoading(false);
      }, 1000);
    };

    // Check immediately
    checkRazorpay();

    // Also check when window loads
    window.addEventListener('load', checkRazorpay);

    return () => {
      window.removeEventListener('load', checkRazorpay);
    };
  }, []);

  const createPayment = (options) => {
    if (!isLoaded) {
      throw new Error('Razorpay is not loaded yet. Please try again.');
    }
    return new window.Razorpay(options);
  };

  return {
    isLoaded,
    isLoading,
    createPayment
  };
};

export default useRazorpay;
