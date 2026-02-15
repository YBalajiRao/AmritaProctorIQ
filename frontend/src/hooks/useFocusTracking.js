import { useEffect, useRef, useState } from "react";

export default function useFocusTracking(onEvent) {
  const [focusStats, setFocusStats] = useState({
    totalFocusTime: 0,
    totalBlurTime: 0,
    focusRatio: 100
  });
  
  const lastFocusTime = useRef(Date.now());
  const isFocused = useRef(true);

  useEffect(() => {
    const handleFocus = () => {
      if (!isFocused.current) {
        const blurDuration = Date.now() - lastFocusTime.current;
        
        setFocusStats(prev => {
          const newBlurTime = prev.totalBlurTime + blurDuration;
          const total = prev.totalFocusTime + newBlurTime;
          return {
            ...prev,
            totalBlurTime: newBlurTime,
            focusRatio: total > 0 ? Math.round((prev.totalFocusTime / total) * 100) : 100
          };
        });

        onEvent({
          type: "window_focus",
          blurDuration: blurDuration,
          timestamp: Date.now()
        });
      }
      
      isFocused.current = true;
      lastFocusTime.current = Date.now();
    };

    const handleBlur = () => {
      if (isFocused.current) {
        const focusDuration = Date.now() - lastFocusTime.current;
        
        setFocusStats(prev => {
          const newFocusTime = prev.totalFocusTime + focusDuration;
          const total = newFocusTime + prev.totalBlurTime;
          return {
            ...prev,
            totalFocusTime: newFocusTime,
            focusRatio: total > 0 ? Math.round((newFocusTime / total) * 100) : 100
          };
        });

        onEvent({
          type: "window_blur",
          focusDuration: focusDuration,
          timestamp: Date.now()
        });
      }
      
      isFocused.current = false;
      lastFocusTime.current = Date.now();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onEvent]);

  return focusStats;
}
