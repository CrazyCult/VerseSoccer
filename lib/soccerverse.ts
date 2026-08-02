const defaultApiBaseUrl = "https://services.soccerverse.com/api";

export const soccerverseApiBaseUrl = process.env.SOCCERVERSE_API_BASE_URL ?? defaultApiBaseUrl;

export async function getHealth() {
  const response = await fetch(soccerverseApiBaseUrl + "/healthz", { next: { revalidate: 60 } });
  if (!response.ok) throw new Error("Soccerverse API health check failed: " + response.status);
  return response.json() as Promise<unknown>;
}
