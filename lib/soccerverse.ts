const defaultApiBaseUrl = "https://services.soccerverse.com/api";
const valueDivisor = 10000;

export const soccerverseApiBaseUrl = process.env.SOCCERVERSE_API_BASE_URL ?? defaultApiBaseUrl;

type Club = {
  club_id: number;
  balance: number;
  country_id: string;
  division: number | null;
  league_id: number | null;
  fans_current: number;
  league_position: number | null;
  manager_name: string | null;
  avg_player_rating_top21: number | null;
  stadium_size_current: number;
  form: string | null;
  total_wages: number | null;
  total_player_value: number | null;
  last_price: number | null;
  volume_7_day: number | null;
};

export type Player = {
  player_id: number;
  position_main: string;
  rating: number;
  fitness: number;
  value: number;
  country_id: string;
  display_name: string;
};

export type ClubSnapshot = {
  club: Club;
  squad: Player[];
  averageFitness: number;
};

export type WalletAccount = {
  name: string;
  clubId: number | null;
  balance: number | null;
  lastActive: string | null;
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

  const playerNames = await getPlayerNames(players.items.map((player) => player.player_id));
  const squad = players.items.map((player) => ({
    ...player,
    display_name: playerNames.get(player.player_id) ?? `Player #${player.player_id}`,
  }));
  const averageFitness = squad.length
    ? Math.round(squad.reduce((total, player) => total + player.fitness, 0) / squad.length)
    : 0;

  return { club, squad, averageFitness } satisfies ClubSnapshot;
}

type DatapackPlayer = { id: string; f?: string; s?: string };
type Datapack = { PackData?: { PlayerData?: { P?: DatapackPlayer[] } } };

async function getPlayerNames(ids: number[]) {
  const requestedIds = new Set(ids);
  const source = process.env.SOCCERVERSE_DATAPACK_URL ?? "https://elrincondeldt.com/sv/rincon_v4.json";
  const response = await fetch(source, { next: { revalidate: 86_400 } });
  if (!response.ok) return new Map<number, string>();

  const datapack = await response.json() as Datapack;
  return new Map((datapack.PackData?.PlayerData?.P ?? [])
    .filter((player) => requestedIds.has(Number(player.id)))
    .map((player) => [Number(player.id), [player.f, player.s].filter(Boolean).join(" ")]));
}

type XayaResponse = {
  data?: { addresses?: Array<{ names?: Array<{ name: string; ns?: { ns?: string } }> }> };
};
type User = { name: string; club_id: number | null; balance: number | null; last_active: string | null };

export async function getWalletAccounts(address: string): Promise<WalletAccount[]> {
  const graphResponse = await fetch("https://graph.soccerverse.com/xaya-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "query NamesByOwner($address: String!) { addresses(where: { id: $address }) { names(first: 100, orderBy: name, orderDirection: asc) { name ns { ns } } } }",
      variables: { address: address.toLowerCase() },
    }),
    next: { revalidate: 60 },
  });
  if (!graphResponse.ok) throw new Error("Xaya lookup failed");

  const graph = await graphResponse.json() as XayaResponse;
  const names = (graph.data?.addresses?.[0]?.names ?? [])
    .filter((entry) => entry.ns?.ns === "p" && entry.name.trim().length > 0)
    .map((entry) => entry.name.trim());
  if (!names.length) return [];

  const query = new URLSearchParams({ per_page: "100" });
  names.forEach((name) => query.append("names", name));
  const users = await apiGet<Paginated<User>>("/users/detailed?" + query.toString());

  return users.items.map((user) => ({
    name: user.name,
    clubId: user.club_id,
    balance: user.balance,
    lastActive: user.last_active,
  }));
}

export function formatSVC(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2, notation: "compact" })
    .format(value / valueDivisor);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}
