import { create } from "zustand";

const useMonitoringStore = create((set, get) => ({
  candidates: [],
  sessions: [],
  alerts: [],
  threshold: 70,

  startSession: (candidate) => {
    const session = {
      id: Date.now(),
      candidateId: candidate.id,
      name: candidate.name,
      status: "ACTIVE",
      startTime: Date.now(),
      endTime: null,
      finalRisk: null,
      confidence: null,
      breakdown: null,
    };

    set({ sessions: [...get().sessions, session] });
  },

  completeSession: (candidateId, analysis) => {
    const updatedSessions = get().sessions.map((s) =>
      s.candidateId === candidateId && s.status === "ACTIVE"
        ? {
            ...s,
            status: "COMPLETED",
            endTime: Date.now(),
            finalRisk: analysis.score,
            confidence: analysis.confidence,
            breakdown: analysis.breakdown,
          }
        : s
    );

    set({ sessions: updatedSessions });
  },

  updateCandidate: (candidate) => {
    const current = get().candidates.filter(c => c.id !== candidate.id);
    const updated = [...current, candidate];

    const risks = updated.map(c => c.risk);
    const mean = risks.reduce((a, b) => a + b, 0) / risks.length || 0;
    const variance =
      risks.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      (risks.length || 1);
    const stdDev = Math.sqrt(variance);
    const adaptiveThreshold = Math.min(mean + stdDev, 95);

    const newAlerts = [...get().alerts];

    if (candidate.risk > adaptiveThreshold) {
      newAlerts.push({
        id: Date.now(),
        candidate: candidate.name,
        risk: candidate.risk,
        time: new Date().toLocaleTimeString(),
      });
    }

    set({
      candidates: updated,
      threshold: adaptiveThreshold,
      alerts: newAlerts,
    });
  },
}));

export default useMonitoringStore;
