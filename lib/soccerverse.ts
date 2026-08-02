const defaultApiBaseUrl = "https://services.soccerverse.com/api";
const valueDivisor = 10000;
const communityPackUrl = "https://elrincondeldt.com/sv/rincon_v1.json";
const playerOverlayUrl = "https://elrincondeldt.com/sv/rincon_v4.json";

export const soccerverseApiBaseUrl = process.env.SOCCERVERSE_API_BASE_URL ?? defaultApiBaseUrl;

export type Club = {
  club_id: number; balance: number; country_id: string; fans_current: number; league_position: number | null;
  manager_name: string | null; avg_player_rating_top21: number | null; stadium_size_current: number;
  stadium_id: number; form: string | null; total_wages: number | null; total_player_value: number | null;
  last_price: number | null; volume_7_day: number | null; division: number | null; league_id: number | null;
  transfers_in: number | null; transfers_out: number | null;
};

export type Player = { player_id: number; position_main: string; rating: number; fitness: number; value: number; country_id: string; display_name: string; age: number; wages: number; contract: number; morale: number; injured: number | null; banned: number; form: string; allow_transfer: number; loaned_to_club: number | null };
export type LeagueRow = { club_id: number; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; pts: number; form: string; new_position: number };
export type Influencer = { name: string; num: number; last_active: string | null };
export type Trade = { id: number; time: string; buyer: string; seller: string; num: number; price: number };
export type ClubNews = { id: number; playerName: string; text: string; date: number };
export type Fixture = { fixture_id: number; home_club: number; away_club: number; home_goals: number | null; away_goals: number | null; attendance: number | null; date: number; played: boolean; comp_type?: number };
export type BalanceSheet = { balance_sheet_id: number; date: number; game_week: number; cash_injection: number; gate_receipts: number; tv_revenue: number; sponsor: number; merchandise: number; transfers_in: number; transfers_out: number; prize_money: number; player_wages: number; ground_maintenance: number; managers_wage: number; agent_wages: number; shareholder_payouts: number; other_income: number; other_outgoings: number };
export type Presentation = { clubName: string; clubBadgeUrl: string; clubColour: string; stadiumName: string; stadiumImageUrl: string; leagueName: string; leagueImageUrl: string; clubNames: Record<number, string>; clubBadges: Record<number, string> };
export type ClubSnapshot = { club: Club; squad: Player[]; averageFitness: number; presentation: Presentation; leagueTable: LeagueRow[]; influencers: Influencer[]; trades: Trade[]; news: ClubNews[]; fixtures: Fixture[]; balanceSheet: BalanceSheet[] };
export type WalletAccount = { name: string; clubId: number | null; clubName: string | null; balance: number | null; lastActive: string | null };
type Paginated<T> = { items: T[] };

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(soccerverseApiBaseUrl + path, { next: { revalidate: 60 }, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Soccerverse API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

type DatapackPlayer = { id: string; f?: string; s?: string };
type DatapackClub = { id: string; n?: string; rgb?: string };
type DatapackStadium = { id: string; n?: string; i?: string };
type DatapackLeague = { c: string; d: string; n?: string; i?: string };
type Datapack = { PackData?: { PlayerData?: { P?: DatapackPlayer[] }; ClubData?: { C?: DatapackClub[]; baseImageUrl?: string }; StadiumData?: { S?: DatapackStadium[]; baseImageUrl?: string }; LeagueData?: { L?: DatapackLeague[]; baseImageUrl?: string } } };

async function getPack() {
  const customPackUrl = process.env.SOCCERVERSE_DATAPACK_URL;
  const [baselineResponse, customResponse, overlayResponse] = await Promise.all([
    fetch(communityPackUrl, { next: { revalidate: 86_400 } }),
    customPackUrl ? fetch(customPackUrl, { next: { revalidate: 86_400 } }) : Promise.resolve(null),
    fetch(process.env.SOCCERVERSE_PLAYER_DATAPACK_URL ?? playerOverlayUrl, { next: { revalidate: 86_400 } }),
  ]);
  const baseline = baselineResponse.ok ? await baselineResponse.json() as Datapack : {};
  const custom = customResponse?.ok ? await customResponse.json() as Datapack : {};
  const overlay = overlayResponse.ok ? await overlayResponse.json() as Datapack : {};
  const baselinePack = baseline.PackData ?? {};
  const customPack = custom.PackData ?? {};
  const basePack = {
    PlayerData: customPack.PlayerData?.P?.length ? customPack.PlayerData : baselinePack.PlayerData,
    ClubData: customPack.ClubData?.C?.length ? customPack.ClubData : baselinePack.ClubData,
    StadiumData: customPack.StadiumData?.S?.length ? customPack.StadiumData : baselinePack.StadiumData,
    LeagueData: customPack.LeagueData?.L?.length ? customPack.LeagueData : baselinePack.LeagueData,
  };
  const overlayPlayers = overlay.PackData?.PlayerData?.P ?? [];
  const players = new Map<number, string>();
  [...(basePack.PlayerData?.P ?? []), ...overlayPlayers].forEach((player) => {
    const name = [player.f, player.s].filter(Boolean).join(" ");
    if (name) players.set(Number(player.id), name);
  });
  const clubs = new Map<number, DatapackClub>();
  (basePack.ClubData?.C ?? []).forEach((club) => clubs.set(Number(club.id), club));
  const stadiums = new Map<number, DatapackStadium>();
  (basePack.StadiumData?.S ?? []).forEach((stadium) => stadiums.set(Number(stadium.id), stadium));
  const leagues = new Map<string, DatapackLeague>();
  (basePack.LeagueData?.L ?? []).forEach((league) => leagues.set(`${league.c}:${league.d}`, league));
  return { players, clubs, stadiums, leagues, clubImageBase: basePack.ClubData?.baseImageUrl ?? "", stadiumImageBase: basePack.StadiumData?.baseImageUrl ?? "", leagueImageBase: basePack.LeagueData?.baseImageUrl ?? "" };
}

async function gspGet<T>(method: string, params: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch("https://services.soccerverse.com/gsp/", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://play.soccerverse.com", Referer: "https://play.soccerverse.com/" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), next: { revalidate: 60 } });
    if (!response.ok) return null;
    const body = await response.json() as { result?: { data?: T } };
    return body.result?.data ?? null;
  } catch { return null; }
}

function absoluteAsset(base: string, filename: string) { return base && base !== "#" ? `${base.replace(/\/$/, "")}/${filename}` : ""; }

export async function getClubSnapshot(clubId = 15516): Promise<ClubSnapshot> {
  const [clubs, players, pack] = await Promise.all([
    apiGet<Paginated<Club>>(`/clubs/detailed?club_id=${clubId}&per_page=5`),
    apiGet<Paginated<Omit<Player, "display_name">>>(`/players/detailed?club_id=${clubId}&per_page=20`),
    getPack(),
  ]);
  const club = clubs.items[0];
  if (!club) throw new Error("Club not found");
  const squad = players.items.map((player) => ({ ...player, display_name: pack.players.get(player.player_id) ?? `Player #${player.player_id}` }));
  const averageFitness = squad.length ? Math.round(squad.reduce((total, player) => total + player.fitness, 0) / squad.length) : 0;
  const [leagueTable, balances, tradeHistory, messages, fixtures, balanceSheet] = await Promise.all([
    club.league_id ? apiGet<LeagueRow[]>(`/league_tables?league_id=${club.league_id}`) : Promise.resolve([]),
    apiGet<Paginated<Influencer>>(`/share_balances?club_id=${clubId}&per_page=10&sort_by=num&sort_order=desc`).then((data) => data.items),
    apiGet<Paginated<Trade>>(`/share_trade_history?club_id=${clubId}&per_page=10&sort_by=unix_time&sort_order=desc`).then((data) => data.items),
    apiGet<Array<{ message_id: number; data_1: number; data_2: number; date: number }>>(`/messages?club_id=${clubId}&season_id=${leagueTableSeasonHint()}&limit=6`).catch(() => []),
    gspGet<Fixture[]>("get_club_schedule", { club_id: clubId, season_id: 4 }).then((data) => data ?? []),
    gspGet<BalanceSheet[]>("get_club_balance_sheet", { club_id: clubId, share_overview_id: clubId, type: "club", since: 7, season_id: 4 }).then((data) => data ?? []),
  ]);
  const clubInfo = pack.clubs.get(clubId);
  const stadium = pack.stadiums.get(club.stadium_id);
  const league = pack.leagues.get(`${club.country_id}:${(club.division ?? 0) + 1}`);
  const badgeBase = pack.clubImageBase.includes("teams/") ? pack.clubImageBase : "https://elrincondeldt.com/sv/photos/teams/";
  const clubName = clubInfo?.n ?? `Club #${clubId}`;
  const presentation: Presentation = {
    clubName, clubBadgeUrl: absoluteAsset(badgeBase, `${clubId}.png`), clubColour: clubInfo?.rgb ?? "74,222,128",
    stadiumName: stadium?.n ?? `Stadium #${club.stadium_id}`, stadiumImageUrl: absoluteAsset(pack.stadiumImageBase, `${club.stadium_id}.jpg`),
    leagueName: league?.n ?? `${club.country_id} Division ${(club.division ?? 0) + 1}`, leagueImageUrl: absoluteAsset(pack.leagueImageBase, league?.i ?? ""),
    clubNames: Object.fromEntries(leagueTable.map((row) => [row.club_id, pack.clubs.get(row.club_id)?.n ?? `Club #${row.club_id}`])),
    clubBadges: Object.fromEntries(leagueTable.map((row) => [row.club_id, absoluteAsset(badgeBase, `${row.club_id}.png`)])),
  };
  const news = messages.map((message) => ({ id: message.message_id, playerName: pack.players.get(message.data_1) ?? `Player #${message.data_1}`, text: message.data_2 ? `signed a contract for ${message.data_2} more seasons.` : "club update", date: message.date }));
  return { club, squad, averageFitness, presentation, leagueTable, influencers: balances, trades: tradeHistory, news, fixtures, balanceSheet };
}

function leagueTableSeasonHint() { return 4; }

type XayaResponse = { data?: { addresses?: Array<{ names?: Array<{ name: string; ns?: { ns?: string } }> }> } };
type User = { name: string; club_id: number | null; balance: number | null; last_active: string | null };

export async function getWalletAccounts(address: string): Promise<WalletAccount[]> {
  const graphResponse = await fetch("https://graph.soccerverse.com/xaya-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "query NamesByOwner($address: String!) { addresses(where: { id: $address }) { names(first: 100, orderBy: name, orderDirection: asc) { name ns { ns } } } }", variables: { address: address.toLowerCase() } }), next: { revalidate: 60 } });
  if (!graphResponse.ok) throw new Error("Xaya lookup failed");
  const graph = await graphResponse.json() as XayaResponse;
  const names = (graph.data?.addresses?.[0]?.names ?? []).filter((entry) => entry.ns?.ns === "p" && entry.name.trim().length > 0).map((entry) => entry.name.trim());
  if (!names.length) return [];
  const query = new URLSearchParams({ per_page: "100" }); names.forEach((name) => query.append("names", name));
  const [users, pack] = await Promise.all([apiGet<Paginated<User>>(`/users/detailed?${query}`), getPack()]);
  return users.items.map((user) => ({ name: user.name, clubId: user.club_id, clubName: user.club_id ? pack.clubs.get(user.club_id)?.n ?? null : null, balance: user.balance, lastActive: user.last_active }));
}

export function formatSVC(value: number) { return new Intl.NumberFormat("en", { maximumFractionDigits: 2, notation: "compact" }).format(value / valueDivisor); }
export function formatNumber(value: number) { return new Intl.NumberFormat("en").format(value); }
