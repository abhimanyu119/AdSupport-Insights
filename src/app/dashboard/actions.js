export async function fetchRuns() {
  const res = await fetch("/api/runs");
  if (!res.ok) {
    throw new Error("Failed to fetch run details");
  }
  return res.json();
}

export async function fetchRunDetails(runId) {
  const res = await fetch(`/api/runs/${runId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch run details");
  }
  return res.json();
}
