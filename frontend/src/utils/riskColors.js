export function getRiskColor(score) {
  if (score < 30) return "bg-green-500";
  if (score < 70) return "bg-yellow-500";
  return "bg-red-600";
}
