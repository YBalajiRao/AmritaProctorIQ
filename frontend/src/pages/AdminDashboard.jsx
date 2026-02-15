import { useEffect, useState } from "react";
import Navbar from "../components/shared/Navbar";
import socket from "../services/socket";

export default function AdminDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    console.log("🔌 Admin Dashboard mounted, setting up socket listeners");

    const handleRiskUpdate = (data) => {
      console.log("📥 Received adminRiskUpdate:", data);
      setLastUpdate(new Date());
      
      setCandidates((prev) => {
        const filtered = prev.filter(c => c.id !== data.id);
        const newCandidate = { 
          ...data, 
          timestamp: new Date(),
          lastSeen: Date.now()
        };
        return [...filtered, newCandidate].sort((a, b) => b.risk - a.risk);
      });
    };

    const handleTerminated = (data) => {
      console.log("❌ Candidate terminated:", data);
      setCandidates((prev) => prev.filter(c => c.id !== data.candidateId));
    };

    socket.on("adminRiskUpdate", handleRiskUpdate);
    socket.on("candidateTerminated", handleTerminated);

    // Cleanup old candidates every 30 seconds
    const cleanup = setInterval(() => {
      setCandidates((prev) => {
        const now = Date.now();
        return prev.filter(c => now - (c.lastSeen || 0) < 60000); // Remove if not seen for 60s
      });
    }, 30000);

    return () => {
      console.log("🔌 Admin Dashboard unmounting, removing listeners");
      socket.off("adminRiskUpdate", handleRiskUpdate);
      socket.off("candidateTerminated", handleTerminated);
      clearInterval(cleanup);
    };
  }, []);

  const getRiskLevel = (risk) => {
    if (risk <= 25) return "low";
    if (risk <= 50) return "medium";
    if (risk <= 75) return "high";
    return "critical";
  };

  const getRiskBadgeColor = (risk) => {
    if (risk <= 25) return "bg-green-100 text-green-700 border-green-200";
    if (risk <= 50) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (risk <= 75) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const terminateExam = (candidateId, candidateName) => {
    if (window.confirm(`Terminate ${candidateName}'s exam?`)) {
      socket.emit("terminateCandidate", { candidateId });
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setSelectedCandidate(null);
      alert(`${candidateName}'s exam terminated.`);
    }
  };

  const warnCandidate = (candidateId, candidateName) => {
    socket.emit("warnCandidate", { 
      candidateId, 
      message: "Warning: Suspicious behavior detected. Please focus on your exam." 
    });
    alert(`Warning sent to ${candidateName}`);
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || getRiskLevel(c.risk) === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: candidates.length,
    low: candidates.filter(c => getRiskLevel(c.risk) === "low").length,
    medium: candidates.filter(c => getRiskLevel(c.risk) === "medium").length,
    high: candidates.filter(c => getRiskLevel(c.risk) === "high").length,
    critical: candidates.filter(c => getRiskLevel(c.risk) === "critical").length,
    mlAnomalies: candidates.filter(c => c.mlAnomaly).length,
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <span className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">📊</span>
                  Live Monitoring Dashboard
                </h1>
                <p className="text-gray-500 mt-1">Real-time behavioral analysis</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 font-semibold">Live</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Last Update</p>
                  <p className="text-lg font-bold text-gray-800">{lastUpdate.toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
                <p className="text-indigo-100 text-sm mb-1">Active Sessions</p>
                <p className="text-4xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-white border-2 border-green-200 p-4 rounded-xl cursor-pointer hover:shadow-lg" onClick={() => setFilter("low")}>
                <p className="text-gray-600 text-sm mb-1">Low Risk</p>
                <p className="text-3xl font-bold text-green-700">{stats.low}</p>
              </div>
              <div className="bg-white border-2 border-yellow-200 p-4 rounded-xl cursor-pointer hover:shadow-lg" onClick={() => setFilter("medium")}>
                <p className="text-gray-600 text-sm mb-1">Medium Risk</p>
                <p className="text-3xl font-bold text-yellow-700">{stats.medium}</p>
              </div>
              <div className="bg-white border-2 border-orange-200 p-4 rounded-xl cursor-pointer hover:shadow-lg" onClick={() => setFilter("high")}>
                <p className="text-gray-600 text-sm mb-1">High Risk</p>
                <p className="text-3xl font-bold text-orange-700">{stats.high}</p>
              </div>
              <div className="bg-white border-2 border-red-200 p-4 rounded-xl cursor-pointer hover:shadow-lg" onClick={() => setFilter("critical")}>
                <p className="text-gray-600 text-sm mb-1">Critical</p>
                <p className="text-3xl font-bold text-red-700">{stats.critical}</p>
              </div>
              <div className="bg-white border-2 border-purple-200 p-4 rounded-xl">
                <p className="text-gray-600 text-sm mb-1">ML Anomalies</p>
                <p className="text-3xl font-bold text-purple-700">{stats.mlAnomalies}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {["all", "low", "medium", "high", "critical"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    filter === f
                      ? f === "all" ? "bg-indigo-600 text-white" :
                        f === "low" ? "bg-green-600 text-white" :
                        f === "medium" ? "bg-yellow-600 text-white" :
                        f === "high" ? "bg-orange-600 text-white" :
                        "bg-red-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg w-64 focus:border-indigo-500"
            />
          </div>

          {/* Candidate Cards */}
          {filteredCandidates.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Active Sessions</h3>
              <p className="text-gray-500">Waiting for candidates to join the exam...</p>
              <p className="text-sm text-gray-400 mt-4">Candidates will appear here when they start their exam</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {filteredCandidates.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCandidate(c)}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden border-2 border-transparent hover:border-indigo-500"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {c.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{c.name || "Unknown"}</h3>
                          <p className="text-sm text-gray-500">ID: {String(c.id).substring(0, 8)}</p>
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-semibold">Risk Score</span>
                        <span className={`text-2xl font-bold ${
                          c.risk <= 25 ? "text-green-600" :
                          c.risk <= 50 ? "text-yellow-600" :
                          c.risk <= 75 ? "text-orange-600" : "text-red-600"
                        }`}>
                          {c.risk}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            c.risk <= 25 ? "bg-green-500" :
                            c.risk <= 50 ? "bg-yellow-500" :
                            c.risk <= 75 ? "bg-orange-500" : "bg-red-500"
                          }`}
                          style={{ width: `${c.risk}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <p className="text-xs text-gray-500">Confidence</p>
                        <p className="text-lg font-bold text-gray-800">{Math.round((c.confidence || 0) * 100)}%</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskBadgeColor(c.risk)}`}>
                        {getRiskLevel(c.risk).toUpperCase()}
                      </span>
                    </div>

                    {c.breakdown && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-xs text-center">
                        <div>
                          <p className="text-gray-500">Tabs</p>
                          <p className="font-bold text-blue-600">{c.breakdown.tabSwitches || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Pastes</p>
                          <p className="font-bold text-purple-600">{c.breakdown.pasteEvents || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Mouse</p>
                          <p className="font-bold text-pink-600">{c.breakdown.mouseEntropy || 0}</p>
                        </div>
                      </div>
                    )}

                    {c.mlAnomaly && (
                      <div className="mt-3 bg-red-50 border-l-4 border-red-500 p-2 rounded-r">
                        <p className="text-xs font-bold text-red-800">⚠️ ML ANOMALY ({c.anomalyScore}%)</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Candidate Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8" onClick={() => setSelectedCandidate(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold">
                    {selectedCandidate.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCandidate.name}</h2>
                    <p className="text-indigo-100">ID: {selectedCandidate.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCandidate(null)} className="text-3xl opacity-80 hover:opacity-100">✕</button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Risk Score</p>
                  <p className="text-3xl font-bold text-indigo-600">{selectedCandidate.risk}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Confidence</p>
                  <p className="text-3xl font-bold text-purple-600">{Math.round((selectedCandidate.confidence || 0) * 100)}%</p>
                </div>
              </div>

              {selectedCandidate.breakdown && (
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-4">Behavioral Breakdown</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <span>Tab Switches</span>
                        <span className="font-bold text-blue-600">{selectedCandidate.breakdown.tabSwitches || 0}</span>
                      </div>
                      <div className="w-full h-2 bg-blue-200 rounded-full">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, (selectedCandidate.breakdown.tabSwitches || 0) * 10)}%` }}></div>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex justify-between mb-2">
                        <span>Paste Events</span>
                        <span className="font-bold text-purple-600">{selectedCandidate.breakdown.pasteEvents || 0}</span>
                      </div>
                      <div className="w-full h-2 bg-purple-200 rounded-full">
                        <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min(100, (selectedCandidate.breakdown.pasteEvents || 0) * 20)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedCandidate.mlAnomaly && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
                  <h3 className="font-bold text-red-800 mb-2">⚠️ ML Anomaly Detected</h3>
                  <p className="text-red-700">Confidence: {selectedCandidate.anomalyScore}%</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => warnCandidate(selectedCandidate.id, selectedCandidate.name)}
                  className="flex-1 bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700"
                >
                  ⚠️ Send Warning
                </button>
                <button
                  onClick={() => terminateExam(selectedCandidate.id, selectedCandidate.name)}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
                >
                  🚫 Terminate Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
