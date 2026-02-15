export function generateMockCandidates() {
  return Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    name: `Candidate ${i + 1}`,
    risk: Math.floor(Math.random() * 100),
    events: Math.floor(Math.random() * 50),
  }));
}
