const defaultApiBaseUrl = "https://services.soccerverse.com/api";
const valueDivisor = 10000;

export const soccerverseApiBaseUrl = process.env.SOCCERVERSE_API_BASE_URL ?? defaultApiBaseUrl;

type Club = {
  club_id: number;
  balance: number;
  country_id: string;
  fans_current: number;
  league_position: number | null;
  manager_name: string | null;
  avg_player_rating_top21: number | null;
  stadium_size_current: number;
  form: string | null;
};

type Player = {
  player_id: number;
  position_main: string;
  rating: number;
  fitness: number;
  value: number;
  country_id: string;
};

type Paginated<T> = { items: T[] };

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(soccerverseApiBaseUrl + path, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error("Soccerverse API request failed: " + response.status);
  return response.json() as Promise<T>;
}

export async function getClubSnapshot(clubId = 15516) {
  const [clubs, players] = await Promise.all([
    apiGet<Paginated<Club>>("/clubs/detailed?club_id=" + clubId + "&per_page=5"),
    apiGet<Paginated<Player>>("/players/detailed?club_id=" + clubId + "&per_page=20"),
  ]);

  const club = clubs.items[0];
  if (!club) throw new Error("Club not found");

  const squad = players.items;
  const averageFitness = squad.length
    ? Math.round(squad.reduce((total, player) => total + player.fitness, 0) / squad.length)
    : 0;

  return { club, squad, averageFitness };
}

export function formatSVC(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2, notation: "compact" })
    .format(value / valueDivisor);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}
