import { useEffect, useRef } from "react";

export default function useMouseTracking(onEvent) {
  const lastPosition = useRef({ x: 0, y: 0 });
  const lastTime = useRef(Date.now());

  useEffect(() => {
    let moveCount = 0;
    
    const handler = (e) => {
      const now = Date.now();
      const timeDiff = now - lastTime.current;
      
      // Only track every 100ms to avoid flooding
      if (timeDiff < 100) return;
      
      const distance = Math.sqrt(
        Math.pow(e.clientX - lastPosition.current.x, 2) + 
        Math.pow(e.clientY - lastPosition.current.y, 2)
      );
      
      const velocity = distance / timeDiff;
      
      onEvent({
        type: "mouse_move",
        x: e.clientX,
        y: e.clientY,
        velocity: velocity,
        distance: distance,
        timestamp: now,
      });
      
      lastPosition.current = { x: e.clientX, y: e.clientY };
      lastTime.current = now;
      moveCount++;
      
      // Log every 10 moves for debugging
      if (moveCount % 10 === 0) {
        console.log(`🖱️ Mouse tracked: ${moveCount} moves, Last velocity: ${velocity.toFixed(2)}`);
      }
    };

    window.addEventListener("mousemove", handler);
    console.log("✅ Mouse tracking ACTIVATED");
    
    return () => {
      window.removeEventListener("mousemove", handler);
      console.log("❌ Mouse tracking DEACTIVATED");
    };
  }, [onEvent]);
}
