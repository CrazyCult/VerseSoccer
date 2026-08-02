import { createPublicClient, encodeFunctionData, fallback, http } from "viem";
import pako from "pako";

export const XAYA_ACCOUNTS_ADDRESS = "0x8C12253F71091b9582908C8a44F78870Ec6F304F" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const xayaAccountsAbi = [
  { type: "function", name: "tokenIdForName", stateMutability: "pure", inputs: [{ name: "ns", type: "string" }, { name: "name", type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nextNonce", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "move", stateMutability: "nonpayable", inputs: [{ name: "ns", type: "string" }, { name: "name", type: "string" }, { name: "mv", type: "string" }, { name: "nonce", type: "uint256" }, { name: "amount", type: "uint256" }, { name: "receiver", type: "address" }], outputs: [] },
] as const;

type TacticPayload = {
  s: string;
  ts: Array<{ id: number; t: number; ts: number }>;
  ta: Array<{ c: { fid: number; gm: number; s: number; t: number }; l: number[]; pi: { c: number; ct: number; fk: number; p: number; pt: number; tm: number }; ps: { s: number; up: number; utm: number } }>;
};

export type TacticDraft = { payload: TacticPayload; publicMove: string; commitMove: string; revealMove: string };
type PendingTactic = { hash: string; prepared: string; tacticsClubId: number };

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function salt() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join("");
}

function compress(value: string) {
  const bytes = pako.deflateRaw(value);
  let binary = "";
  bytes.forEach((item) => { binary += String.fromCharCode(item); });
  return btoa(binary);
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (item) => item.toString(16).padStart(2, "0")).join("");
}

export async function createTacticDraft(playerIds: number[], formationId: number, playStyle: number, clubId: number): Promise<TacticDraft> {
  if (playerIds.length < 18) throw new Error("18 joueurs sont nécessaires pour préparer une composition.");
  const selected = playerIds.slice(0, 18);
  if (new Set(selected).size !== 18) throw new Error("La sélection contient des joueurs en double.");
  const payload: TacticPayload = {
    s: salt(),
    ts: selected.map((id) => ({ id, t: 2, ts: 2 })),
    ta: [{ c: { fid: formationId, gm: 0, s: 0, t: 0 }, l: Array.from({ length: 18 }, (_, index) => index), pi: { c: 0, ct: 0, fk: 0, p: 0, pt: 0, tm: 0 }, ps: { s: playStyle, up: 0, utm: 0 } }],
  };
  const raw = stableStringify(payload);
  const compressed = compress(raw);
  const hash = await sha256(raw);
  return {
    payload,
    publicMove: JSON.stringify({ g: { sv: { st: { s: compressed } } } }),
    commitMove: JSON.stringify({ g: { sv: { st: { c: hash } } } }),
    revealMove: JSON.stringify({ g: { sv: { st: { r: { c: clubId, t: compressed } } } } }),
  };
}

export async function importPendingTactic(serialized: string): Promise<TacticDraft> {
  let pending: PendingTactic;
  try { pending = JSON.parse(serialized) as PendingTactic; } catch { throw new Error("Le texte importé n’est pas un JSON de tactique valide."); }
  if (!pending.hash || !pending.prepared || !Number.isInteger(pending.tacticsClubId)) throw new Error("Il manque hash, prepared ou tacticsClubId.");
  let raw: string;
  try {
    const binary = atob(pending.prepared);
    raw = pako.inflateRaw(Uint8Array.from(binary, (character) => character.charCodeAt(0)), { to: "string" });
  } catch { throw new Error("La chaîne prepared ne peut pas être décompressée (Deflate Raw attendu)."); }
  if (await sha256(raw) !== pending.hash) throw new Error("Le hash ne correspond pas au contenu prepared : reveal bloqué par sécurité.");
  const payload = JSON.parse(raw) as TacticPayload;
  return {
    payload,
    publicMove: JSON.stringify({ g: { sv: { st: { s: pending.prepared } } } }),
    commitMove: JSON.stringify({ g: { sv: { st: { c: pending.hash } } } }),
    revealMove: JSON.stringify({ g: { sv: { st: { r: { c: pending.tacticsClubId, t: pending.prepared } } } } }),
  };
}

export async function composeXayaMove(name: string, move: string) {
  // polygon-rpc.com now requires an API key. Keep two public Polygon endpoints so a
  // temporary rate limit on one provider does not block a wallet from preparing a move.
  const client = createPublicClient({ transport: fallback([http("https://polygon.drpc.org"), http("https://polygon.publicnode.com")]) });
  const tokenId = await client.readContract({ address: XAYA_ACCOUNTS_ADDRESS, abi: xayaAccountsAbi, functionName: "tokenIdForName", args: ["p", name] });
  const nonce = await client.readContract({ address: XAYA_ACCOUNTS_ADDRESS, abi: xayaAccountsAbi, functionName: "nextNonce", args: [tokenId] });
  return {
    tokenId,
    nonce,
    data: encodeFunctionData({ abi: xayaAccountsAbi, functionName: "move", args: ["p", name, move, nonce, 0n, ZERO_ADDRESS] }),
  };
}
