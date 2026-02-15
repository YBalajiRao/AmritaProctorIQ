import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function CandidateDetailModal({ candidate, onClose }) {
  if (!candidate) return null;

  const breakdownEntries = Object.entries(candidate.breakdown || {});

  const timelineData = Array.from({ length: 10 }, (_, i) => ({
    time: i,
    risk: Math.max(candidate.risk - (10 - i) * 2, 0),
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white w-[700px] p-8 rounded-xl shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500"
        >
          ?
        </button>

        <h2 className="text-2xl font-bold mb-4 text-primary">
          {candidate.name} - Risk Analysis
        </h2>

        <div className="mb-4">
          <p><strong>Risk Score:</strong> {candidate.risk}</p>
          <p><strong>Confidence:</strong> {(candidate.confidence * 100).toFixed(0)}%</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Risk Contribution Breakdown</h3>

          {breakdownEntries.map(([key, value]) => (
            <div key={key} className="mb-2">
              <div className="flex justify-between text-sm">
                <span>{key}</span>
                <span>{value.toFixed(2)}</span>
              </div>
              <div className="bg-gray-200 h-2 rounded">
                <div
                  className="bg-primary h-2 rounded"
                  style={{ width: `${Math.min(value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="h-60">
          <h3 className="font-semibold mb-2">Risk Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="risk" stroke="#4F46E5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
