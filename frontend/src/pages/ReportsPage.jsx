import { useState, useEffect } from "react";
import Navbar from "../components/shared/Navbar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

export default function ReportsPage() {
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/sessions");
      const data = await response.json();

      const formatted = data.map(s => ({
        id: s._id,
        candidateName: s.candidateName || "Unknown",
        candidateEmail: s.candidateEmail || "N/A",
        examDate: new Date(s.createdAt).toLocaleString(),
        duration: formatDuration(s.duration),
        durationSeconds: s.duration || 0,
        riskScore: s.finalRiskScore || 0,
        riskLevel: getRiskLevel(s.finalRiskScore || 0),
        tabSwitches: s.behavioralData?.tabSwitches || 0,
        pasteEvents: s.behavioralData?.pasteEvents || 0,
        mouseEntropy: s.behavioralData?.mouseEntropy || 0,
        mlAnomaly: s.behavioralData?.mlAnomalyDetected || false,
        anomalyScore: s.behavioralData?.anomalyScore || 0,
        questionsAttempted: s.questionsAttempted || 0,
        totalQuestions: s.totalQuestions || 8,
        status: s.status || "completed",
        riskHistory: s.riskHistory || []
      }));

      setSessions(formatted);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRiskLevel = (risk) => {
    if (risk <= 25) return "low";
    if (risk <= 50) return "medium";
    if (risk <= 75) return "high";
    return "critical";
  };

  const getRiskColor = (risk) => {
    if (risk <= 25) return "text-green-600 bg-green-100";
    if (risk <= 50) return "text-yellow-600 bg-yellow-100";
    if (risk <= 75) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.candidateName.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesFilter = true;
    if (filter === "high") matchesFilter = s.riskScore > 75;
    else if (filter === "medium") matchesFilter = s.riskScore > 50 && s.riskScore <= 75;
    else if (filter === "low") matchesFilter = s.riskScore <= 50;
    return matchesSearch && matchesFilter;
  });

  // Chart Data
  const riskDistribution = [
    { name: "Low (0-25)", value: sessions.filter(s => s.riskScore <= 25).length, color: "#10B981" },
    { name: "Medium (26-50)", value: sessions.filter(s => s.riskScore > 25 && s.riskScore <= 50).length, color: "#F59E0B" },
    { name: "High (51-75)", value: sessions.filter(s => s.riskScore > 50 && s.riskScore <= 75).length, color: "#F97316" },
    { name: "Critical (76+)", value: sessions.filter(s => s.riskScore > 75).length, color: "#EF4444" }
  ].filter(d => d.value > 0);

  const behaviorData = sessions.slice(0, 10).map(s => ({
    name: s.candidateName.split(" ")[0],
    tabs: s.tabSwitches,
    pastes: s.pasteEvents,
    risk: s.riskScore
  }));

  const downloadPDF = () => {
    if (filteredSessions.length === 0) { alert("No data!"); return; }
    try {
      const doc = new jsPDF();
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, 220, 40, "F");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("AmritaProctorIQ", 14, 18);
      doc.setFontSize(12);
      doc.text("Examination Report", 14, 28);
      doc.setFontSize(10);
      doc.text("Generated: " + new Date().toLocaleString(), 14, 36);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Total: ${filteredSessions.length} | High Risk: ${filteredSessions.filter(s => s.riskScore > 75).length} | ML Anomalies: ${filteredSessions.filter(s => s.mlAnomaly).length}`, 14, 50);

      const tableData = filteredSessions.map(s => [
        s.candidateName.substring(0, 15), s.riskScore.toString(), s.tabSwitches.toString(),
        s.pasteEvents.toString(), s.mlAnomaly ? `YES (${s.anomalyScore}%)` : "NO", s.duration, s.status.toUpperCase()
      ]);

      autoTable(doc, {
        startY: 58,
        head: [["Candidate", "Risk", "Tabs", "Pastes", "ML Anomaly", "Duration", "Status"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [67, 56, 202], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 }
      });

      doc.save(`AmritaProctorIQ-Report-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) { console.error(e); alert("PDF error"); }
  };

  const downloadCSV = () => {
    if (filteredSessions.length === 0) { alert("No data!"); return; }
    const headers = ["Candidate", "Email", "Risk", "Tabs", "Pastes", "ML Anomaly", "Duration", "Status"];
    const rows = filteredSessions.map(s => [s.candidateName, s.candidateEmail, s.riskScore, s.tabSwitches, s.pasteEvents, s.mlAnomaly ? "YES" : "NO", s.duration, s.status]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Report-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Exam Reports & Analytics</h1>
                <p className="text-gray-500 mt-1">Behavioral analysis with visual insights</p>
              </div>
              <div className="flex gap-3">
                <button onClick={downloadPDF} disabled={sessions.length === 0} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400">PDF</button>
                <button onClick={downloadCSV} disabled={sessions.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400">CSV</button>
                <button onClick={fetchSessions} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Refresh</button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
              <p className="text-gray-500 text-sm">Total Sessions</p>
              <p className="text-3xl font-bold text-indigo-600">{sessions.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <p className="text-gray-500 text-sm">High Risk</p>
              <p className="text-3xl font-bold text-red-600">{sessions.filter(s => s.riskScore > 75).length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm">ML Anomalies</p>
              <p className="text-3xl font-bold text-purple-600">{sessions.filter(s => s.mlAnomaly).length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <p className="text-gray-500 text-sm">Terminated</p>
              <p className="text-3xl font-bold text-orange-600">{sessions.filter(s => s.status === "terminated").length}</p>
            </div>
          </div>

          {/* Charts Row */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Risk Distribution Pie Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {riskDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Behavior Comparison Bar Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">Behavioral Metrics (Last 10)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={behaviorData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tabs" name="Tab Switches" fill="#6366F1" />
                    <Bar dataKey="pastes" name="Paste Events" fill="#A855F7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex gap-4">
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg" />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border-2 border-gray-200 rounded-lg">
                <option value="all">All</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="animate-spin w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Reports</h3>
              <p className="text-gray-500">Complete exams to see data</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Candidate</th>
                    <th className="px-6 py-4 text-center">Risk</th>
                    <th className="px-6 py-4 text-center">Tabs</th>
                    <th className="px-6 py-4 text-center">Pastes</th>
                    <th className="px-6 py-4 text-center">ML</th>
                    <th className="px-6 py-4 text-center">Duration</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedSession(s)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">{s.candidateName.charAt(0)}</div>
                          <div><div className="font-semibold">{s.candidateName}</div><div className="text-sm text-gray-500">{s.candidateEmail}</div></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-sm font-bold ${getRiskColor(s.riskScore)}`}>{s.riskScore}</span></td>
                      <td className="px-6 py-4 text-center font-semibold text-blue-600">{s.tabSwitches}</td>
                      <td className="px-6 py-4 text-center font-semibold text-purple-600">{s.pasteEvents}</td>
                      <td className="px-6 py-4 text-center">{s.mlAnomaly ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">YES</span> : <span className="text-green-600">NO</span>}</td>
                      <td className="px-6 py-4 text-center font-mono">{s.duration}</td>
                      <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.status.toUpperCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSession(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedSession.candidateName}</h2>
                  <p className="text-indigo-100">{selectedSession.candidateEmail}</p>
                </div>
                <button onClick={() => setSelectedSession(null)} className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600">Risk Score</p>
                  <p className="text-3xl font-bold text-indigo-600">{selectedSession.riskScore}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-3xl font-bold text-purple-600">{selectedSession.duration}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`text-xl font-bold ${selectedSession.status === "completed" ? "text-green-600" : "text-red-600"}`}>{selectedSession.status.toUpperCase()}</p>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 mb-3">Behavioral Breakdown</h3>
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2"><span>Tab Switches</span><span className="font-bold text-blue-600">{selectedSession.tabSwitches}</span></div>
                  <div className="w-full h-2 bg-blue-200 rounded-full"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, selectedSession.tabSwitches * 10)}%` }}></div></div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2"><span>Paste Events</span><span className="font-bold text-purple-600">{selectedSession.pasteEvents}</span></div>
                  <div className="w-full h-2 bg-purple-200 rounded-full"><div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min(100, selectedSession.pasteEvents * 15)}%` }}></div></div>
                </div>
                {selectedSession.mlAnomaly && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <p className="font-bold text-red-800">ML Anomaly Detected</p>
                    <p className="text-red-700">Confidence: {selectedSession.anomalyScore}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
