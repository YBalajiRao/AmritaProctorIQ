function variance(arr) {
  if (!arr || arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
}

export function calculateRiskAdvanced(events, baseline) {
  if (!events || events.length === 0) {
    return { score: 0, confidence: 0, breakdown: { tabSwitches: 0, pasteEvents: 0, mouseEntropy: 0, keystrokeAnomaly: 0 }, mlAnomaly: false, anomalyScore: 0, features: {} };
  }

  const tabSwitches = events.filter(e => e.type === "tab_switch").length;
  const pasteEvents = events.filter(e => e.type === "paste").length;
  const mouseEvents = events.filter(e => e.type === "mouse_move");
  const keystrokeEvents = events.filter(e => e.type === "keystroke");
  const dwellEvents = events.filter(e => e.type === "question_dwell");

  // Mouse entropy
  let mouseEntropyDeviation = 0;
  if (mouseEvents.length > 0 && baseline?.mouseEntropy) {
    const currentEntropy = mouseEvents.reduce((sum, e) => sum + Math.abs(e.x) + Math.abs(e.y), 0) / mouseEvents.length;
    mouseEntropyDeviation = Math.abs(currentEntropy - baseline.mouseEntropy);
  }
  const normalizedMouseEntropy = Math.min(Math.round(mouseEntropyDeviation / 10), 100);

  // Keystroke rhythm analysis
  let keystrokeAnomaly = 0;
  if (keystrokeEvents.length > 5 && baseline?.typingInterval) {
    const avgInterval = keystrokeEvents.reduce((sum, e) => sum + (e.interval || 0), 0) / keystrokeEvents.length;
    const deviation = Math.abs(avgInterval - baseline.typingInterval) / baseline.typingInterval;
    keystrokeAnomaly = Math.min(Math.round(deviation * 50), 100);
  }

  // Question dwell anomaly (very fast = suspicious)
  let dwellAnomaly = 0;
  if (dwellEvents.length > 0) {
    const avgDwell = dwellEvents.reduce((sum, e) => sum + e.dwellTime, 0) / dwellEvents.length;
    if (avgDwell < 5000) dwellAnomaly = 30; // Less than 5 sec per question
    else if (avgDwell < 10000) dwellAnomaly = 15;
  }

  // Features for ML
  const features = {
    tabSwitchRate: events.length > 0 ? (tabSwitches / events.length) * 100 : 0,
    pasteRate: events.length > 0 ? (pasteEvents / events.length) * 100 : 0,
    mouseVariance: mouseEvents.length > 5 ? calculateMouseVariance(mouseEvents) : 0,
    actionDensity: calculateActionDensity(events),
    sequencePatternScore: calculateSequenceAnomaly(events),
    keystrokeAnomaly: keystrokeAnomaly,
    dwellAnomaly: dwellAnomaly
  };

  const anomalyScore = calculateAnomalyScore(features, tabSwitches, pasteEvents);
  const isAnomaly = anomalyScore > 0.5 || tabSwitches >= 3 || pasteEvents >= 3;

  // Score calculation
  const tabSwitchScore = Math.min(tabSwitches * 15, 100);
  const pasteScore = Math.min(pasteEvents * 25, 100);
  const mouseScore = Math.min(normalizedMouseEntropy, 100);
  const keystrokeScore = keystrokeAnomaly;
  const dwellScore = dwellAnomaly;

  const weights = { tabSwitch: 0.25, paste: 0.25, mouse: 0.15, keystroke: 0.10, dwell: 0.10, mlAnomaly: 0.15 };
  const mlBoost = isAnomaly ? Math.max(anomalyScore, 0.5) * 100 : 0;

  const totalScore = Math.round(
    (tabSwitchScore * weights.tabSwitch) +
    (pasteScore * weights.paste) +
    (mouseScore * weights.mouse) +
    (keystrokeScore * weights.keystroke) +
    (dwellScore * weights.dwell) +
    (mlBoost * weights.mlAnomaly)
  );

  let confidence = 0;
  if (events.length > 10) confidence += 0.3;
  if (events.length > 30) confidence += 0.2;
  if (tabSwitches > 0 || pasteEvents > 0) confidence += 0.3;
  if (keystrokeEvents.length > 10) confidence += 0.1;
  if (isAnomaly) confidence += 0.1;

  return {
    score: Math.min(totalScore, 100),
    confidence: Math.min(confidence, 1),
    breakdown: { tabSwitches, pasteEvents, mouseEntropy: normalizedMouseEntropy, keystrokeAnomaly },
    mlAnomaly: isAnomaly,
    anomalyScore: Math.round(Math.max(anomalyScore, isAnomaly ? 0.5 : 0) * 100),
    features
  };
}

function calculateMouseVariance(mouseEvents) {
  if (mouseEvents.length < 2) return 0;
  const xCoords = mouseEvents.map(e => e.x);
  const yCoords = mouseEvents.map(e => e.y);
  return Math.sqrt(variance(xCoords) + variance(yCoords));
}

function calculateActionDensity(events) {
  if (events.length < 2) return 0;
  const timestamps = events.map(e => e.timestamp);
  const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
  if (timeSpan === 0) return 0;
  return (events.length / (timeSpan / 1000)) * 10;
}

function calculateSequenceAnomaly(events) {
  if (events.length < 3) return 0;
  let suspiciousPatterns = 0;
  for (let i = 0; i < events.length - 2; i++) {
    const e1 = events[i], e2 = events[i + 1], e3 = events[i + 2];
    if (e1.type === "tab_switch" && e2.type === "paste" && e3.type === "tab_switch") suspiciousPatterns += 2;
    if (e1.type === "tab_switch" && e2.type === "paste") suspiciousPatterns += 1;
  }
  return Math.min(suspiciousPatterns * 15, 100);
}

function calculateAnomalyScore(features, tabSwitches, pasteEvents) {
  const normalRanges = {
    tabSwitchRate: { min: 0, max: 3 },
    pasteRate: { min: 0, max: 2 },
    mouseVariance: { min: 50, max: 400 },
    actionDensity: { min: 0.5, max: 4 },
    sequencePatternScore: { min: 0, max: 10 }
  };

  let anomalySum = 0, featureCount = 0;
  for (const [key, value] of Object.entries(features)) {
    if (normalRanges[key]) {
      const range = normalRanges[key];
      let deviation = 0;
      if (value < range.min) deviation = (range.min - value) / (range.min || 1);
      else if (value > range.max) deviation = (value - range.max) / (range.max || 1);
      anomalySum += Math.min(deviation, 1);
      featureCount++;
    }
  }

  let rawBoost = 0;
  if (tabSwitches >= 2) rawBoost += 0.2;
  if (tabSwitches >= 4) rawBoost += 0.2;
  if (pasteEvents >= 2) rawBoost += 0.2;
  if (pasteEvents >= 4) rawBoost += 0.2;

  return Math.min((featureCount > 0 ? anomalySum / featureCount : 0) + rawBoost, 1);
}
