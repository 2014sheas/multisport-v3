"use client";

import { useEffect, useState } from "react";

interface PerformanceMonitorProps {
  pageName: string;
}

export default function PerformanceMonitor({
  pageName,
}: PerformanceMonitorProps) {
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const startTime = performance.now();

    const handleLoad = () => {
      const endTime = performance.now();
      const loadTimeMs = endTime - startTime;
      setLoadTime(loadTimeMs);

      // Show performance warning if load time is too high
      if (loadTimeMs > 2000) {
        setIsVisible(true);
        console.warn(
          `🚨 Slow page load detected: ${pageName} took ${loadTimeMs.toFixed(
            0
          )}ms`
        );
      }
    };

    // Listen for when the page is fully loaded
    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, [pageName]);

  if (!isVisible || !loadTime) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <div className="text-yellow-600">⚠️</div>
        <div className="text-sm">
          <div className="font-medium text-yellow-800">Performance Notice</div>
          <div className="text-yellow-700">
            {pageName} loaded in {loadTime.toFixed(0)}ms
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-yellow-600 hover:text-yellow-800 text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
}
