import { useEffect, useRef } from "react";

export default function useKeystrokeTracking(onEvent) {
  const lastKeyTime = useRef(Date.now());
  const keyIntervals = useRef([]);

  useEffect(() => {
    const handler = (e) => {
      const now = Date.now();
      const interval = now - lastKeyTime.current;
      lastKeyTime.current = now;

      // Only track reasonable intervals (ignore first keypress and very long pauses)
      if (interval > 50 && interval < 5000) {
        keyIntervals.current.push(interval);
      }

      // Calculate typing rhythm metrics every 10 keystrokes
      if (keyIntervals.current.length >= 10) {
        const intervals = keyIntervals.current.slice(-20); // Last 20 intervals
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
        const rhythmScore = Math.sqrt(variance);

        onEvent({
          type: "keystroke_rhythm",
          avgInterval: Math.round(avgInterval),
          variance: Math.round(variance),
          rhythmScore: Math.round(rhythmScore),
          keyCount: keyIntervals.current.length,
          timestamp: now,
        });
      }

      // Track individual keystrokes (without capturing the actual key for privacy)
      onEvent({
        type: "keystroke",
        interval: interval,
        timestamp: now,
      });
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEvent]);
}
