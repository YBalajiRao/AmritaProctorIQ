// Server-side risk calculation with security
import crypto from "crypto";

class ServerRiskEngine {
  constructor() {
    this.sessionData = new Map();
    this.SECRET_KEY = process.env.JWT_SECRET || "secret-key";
  }

  // Validate event integrity
  validateEvent(event, signature, sessionId) {
    const expectedSignature = crypto
      .createHmac("sha256", this.SECRET_KEY + sessionId)
      .update(JSON.stringify(event))
      .digest("hex");
    
    return signature === expectedSignature;
  }

  // Server-side risk calculation
  calculateRisk(sessionId, events) {
    console.log(`Calculating risk for session ${sessionId} with ${events.length} events`);
    
    // Get behavioral metrics
    const metrics = this.extractMetrics(events);
    
    // Calculate risk components
    const tabSwitchRisk = Math.min(metrics.tabSwitches * 15, 100);
    const pasteRisk = Math.min(metrics.pasteEvents * 25, 100);
    const mouseRisk = this.calculateMouseEntropy(metrics.mouseEvents);
    const focusRisk = (1 - metrics.focusRatio) * 100;
    
    // Pattern detection
    const suspiciousPatterns = this.detectPatterns(events);
    const patternRisk = suspiciousPatterns * 20;
    
    // Weighted risk calculation (server-side only!)
    const weights = {
      tabSwitch: 0.25,
      paste: 0.25,
      mouse: 0.15,
      focus: 0.15,
      patterns: 0.20
    };
    
    const totalRisk = Math.round(
      tabSwitchRisk * weights.tabSwitch +
      pasteRisk * weights.paste +
      mouseRisk * weights.mouse +
      focusRisk * weights.focus +
      patternRisk * weights.patterns
    );
    
    // ML anomaly detection (simplified for now)
    const mlAnomaly = this.detectMLAnomaly(metrics);
    
    return {
      risk: Math.min(totalRisk, 100),
      breakdown: {
        tabSwitches: metrics.tabSwitches,
        pasteEvents: metrics.pasteEvents,
        mouseEntropy: Math.round(mouseRisk),
        focusRatio: Math.round(metrics.focusRatio * 100),
        patterns: suspiciousPatterns
      },
      mlAnomaly: mlAnomaly.detected,
      anomalyScore: mlAnomaly.score,
      timestamp: Date.now(),
      confidence: this.calculateConfidence(events.length)
    };
  }

  extractMetrics(events) {
    const tabSwitches = events.filter(e => e.type === "tab_switch").length;
    const pasteEvents = events.filter(e => e.type === "paste").length;
    const mouseEvents = events.filter(e => e.type === "mouse_move");
    const focusEvents = events.filter(e => e.type === "window_blur" || e.type === "window_focus");
    
    // Calculate focus ratio
    let focusTime = 0, blurTime = 0;
    focusEvents.forEach(e => {
      if (e.type === "window_blur" && e.focusDuration) {
        focusTime += e.focusDuration;
      } else if (e.type === "window_focus" && e.blurDuration) {
        blurTime += e.blurDuration;
      }
    });
    
    const totalTime = focusTime + blurTime || 1;
    const focusRatio = focusTime / totalTime;
    
    return {
      tabSwitches,
      pasteEvents,
      mouseEvents,
      focusRatio: isNaN(focusRatio) ? 1 : focusRatio
    };
  }

  calculateMouseEntropy(mouseEvents) {
    if (mouseEvents.length < 5) return 0;
    
    // Calculate movement entropy
    const velocities = mouseEvents.map(e => e.velocity || 0).filter(v => v > 0);
    if (velocities.length === 0) return 0;
    
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    
    // Low variance = potentially automated
    const entropy = Math.min(Math.sqrt(variance) * 5, 100);
    
    return entropy;
  }

  detectPatterns(events) {
    let suspiciousPatterns = 0;
    
    // Detect tab->paste->tab pattern
    for (let i = 0; i < events.length - 2; i++) {
      if (events[i].type === "tab_switch" &&
          events[i + 1].type === "paste" &&
          events[i + 2].type === "tab_switch") {
        
        const timeDiff = events[i + 2].timestamp - events[i].timestamp;
        if (timeDiff < 5000) { // Within 5 seconds
          suspiciousPatterns++;
        }
      }
    }
    
    // Detect rapid paste events
    const pasteEvents = events.filter(e => e.type === "paste");
    for (let i = 1; i < pasteEvents.length; i++) {
      const timeDiff = pasteEvents[i].timestamp - pasteEvents[i - 1].timestamp;
      if (timeDiff < 2000) { // Multiple pastes within 2 seconds
        suspiciousPatterns++;
      }
    }
    
    return suspiciousPatterns;
  }

  detectMLAnomaly(metrics) {
    // Simplified anomaly detection (replace with real ML later)
    const anomalyScore = 
      (metrics.tabSwitches > 5 ? 30 : 0) +
      (metrics.pasteEvents > 3 ? 40 : 0) +
      (metrics.focusRatio < 0.7 ? 30 : 0);
    
    return {
      detected: anomalyScore > 50,
      score: Math.min(anomalyScore, 100)
    };
  }

  calculateConfidence(eventCount) {
    // More events = higher confidence
    if (eventCount < 10) return 0.2;
    if (eventCount < 30) return 0.5;
    if (eventCount < 50) return 0.7;
    if (eventCount < 100) return 0.85;
    return 0.95;
  }
}

export default ServerRiskEngine;
