"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/soccerverse";
import { composeXayaMove, createTacticDraft, XAYA_ACCOUNTS_ADDRESS } from "@/lib/xaya";

declare global {
  interface Window { ethereum?: { request: (request: { method: string; params?: unknown[] }) => Promise<unknown> } }
}

type Situation = { id: number; minute: number; formationId: number; playStyle: number; scoreCondition: number; goalMargin: number };

const formations = [
  [0, "4-4-2"], [1, "4-3-3"], [2, "4-5-1"], [3, "3-4-3"], [4, "3-5-2"], [5, "3-3-4"], [6, "5-4-1"], [7, "5-3-2"], [8, "5-2-3"], [9, "4-4-2 (Diamond)"], [10, "4-3-3 Wingers"], [11, "4-5-1 Defensive"], [12, "4-2-3-1"], [13, "4-1-2-2-1"], [14, "4-4-1-1"], [15, "4-3-1-2"], [16, "3-4-1-2"], [17, "5-3-2 Libero"], [18, "5-3-2 Defensive"], [19, "4-2-4"], [20, "4-2-2-2"], [21, "3-4-2-1"], [22, "4-1-3-2"], [23, "3-2-2-2-1"],
] as const;
const styles = ["Normal", "Defensive", "Offensive", "Passing", "Counter attack", "Long balls"];
const scoreConditions = ["Always", "Winning", "Losing", "Drawing", "Losing or drawing", "Winning or drawing"];

export function TacticWorkbench({ wallet, accountName, clubId, squad, onMessage }: { wallet: string | null; accountName: string | null; clubId: number; squad: Player[]; onMessage: (value: string) => void }) {
  const [formation, setFormation] = useState(1);
  const [playStyle, setPlayStyle] = useState(0);
  const [tempo, setTempo] = useState(1);
  const [tackling, setTackling] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [selection, setSelection] = useState<number[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [captain, setCaptain] = useState<number | null>(null);
  const [penaltyTaker, setPenaltyTaker] = useState<number | null>(null);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [chainId, setChainId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof createTacticDraft>> | null>(null);
  const [status, setStatus] = useState("Choose your XI and instructions, then prepare the team sheet.");

  const players = useMemo(() => new Map(squad.map((player) => [player.player_id, player])), [squad]);
  const starters = selection.slice(0, 11);
  const subs = selection.slice(11, 18);
  const roleId = (candidate: number | null) => starters.includes(candidate ?? -1) ? candidate as number : starters[0];
  const roleIndex = (candidate: number | null) => Math.max(0, starters.indexOf(roleId(candidate)));

  useEffect(() => {
    if (selection.length || !squad.length) return;
    const rank = (position: string) => position === "GK" ? 0 : /B|D/.test(position) ? 1 : /M/.test(position) ? 2 : 3;
    setSelection([...squad].sort((left, right) => rank(left.position_main) - rank(right.position_main) || right.rating - left.rating).slice(0, 18).map((player) => player.player_id));
  }, [selection.length, squad]);
  useEffect(() => { void refreshChain(setChainId); }, []);

  function togglePlayer(id: number) {
    setSelection((current) => {
      const index = current.indexOf(id);
      if (activeSlot !== null) {
        const next = [...current];
        if (index >= 0) [next[activeSlot], next[index]] = [next[index], next[activeSlot]];
        else { next[activeSlot] = id; }
        setActiveSlot(null); return next;
      }
      if (index >= 0) return current.filter((value) => value !== id);
      if (current.length >= 18) { setStatus("18 players maximum. Select a pitch slot to replace a player."); return current; }
      return [...current, id];
    });
  }
  function replaceFromBench(id: number) { if (activeSlot === null) { setStatus("Tap a player on the pitch first, then choose the substitute."); return; } togglePlayer(id); }
  function updateSituation(id: number, key: keyof Omit<Situation, "id">, value: number) { setSituations((current) => current.map((situation) => situation.id === id ? { ...situation, [key]: value } : situation)); }
  function addSituation() { setSituations((current) => [...current, { id: Date.now(), minute: 60, formationId: formation, playStyle, scoreCondition: 0, goalMargin: 0 }]); }

  async function prepare() {
    try {
      if (selection.length !== 18 || starters.length !== 11) throw new Error("Exactly 18 players, including 11 starters, are required.");
      const draft = await createTacticDraft(selection, { formationId: formation, playStyle, captain: roleIndex(captain), penaltyTaker: roleIndex(penaltyTaker), tempo, tackling, situations: situations.map(({ minute, formationId, playStyle, scoreCondition, goalMargin }) => ({ minute, formationId, playStyle, scoreCondition, goalMargin })) }, clubId);
      setPrepared(draft);
      setStatus(`${hidden ? "Hidden commit" : "Public team sheet"} is ready with ${situations.length} match situation${situations.length === 1 ? "" : "s"}. Simulate it before signing.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to prepare tactics."); }
  }
  async function execute(live: boolean) {
    if (!wallet || !accountName || !window.ethereum) { setStatus("Connect the manager MetaMask wallet first."); return; }
    if (!prepared) { setStatus("Prepare the team sheet first."); return; }
    try {
      await ensurePolygon(); await refreshChain(setChainId);
      const move = hidden ? prepared.commitMove : prepared.publicMove;
      const transaction = await composeXayaMove(accountName, move);
      if (!live) {
        const gas = await window.ethereum.request({ method: "eth_estimateGas", params: [{ from: wallet, to: XAYA_ACCOUNTS_ADDRESS, data: transaction.data }] });
        setStatus(`Polygon simulation accepted. Xaya nonce ${transaction.nonce}; estimated gas ${String(gas)}. Nothing was sent.`); return;
      }
      if (!confirmed) throw new Error("Confirm the real on-chain action before opening MetaMask.");
      const hash = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: wallet, to: XAYA_ACCOUNTS_ADDRESS, data: transaction.data }] });
      setStatus(`Submitted to MetaMask: ${String(hash)}. Wait for Polygon confirmation and GSP indexing.`);
      onMessage("Tactic sent on Polygon. Refresh club data after the game indexes the move.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Wallet rejected the action."); }
  }

  return <section className="tactic-workbench new-board">
    <header><div><b>TACTIC BOARD · {selection.length}/18</b><span>Choose players, formation, team instructions and game situations.</span></div><span className="tactic-state">{hidden ? "HIDE" : "PUBLIC"}</span></header>
    <div className={chainId === "0x89" ? "network-bar ready" : "network-bar"}><b>{chainId === "0x89" ? "● POLYGON CONNECTED" : "● POLYGON REQUIRED"}</b><span>{chainId === "0x89" ? "Ready for Xaya validation." : "No Soccerverse move can be sent on Ethereum."}</span><button onClick={() => void ensurePolygon().then(() => refreshChain(setChainId))}>SWITCH TO POLYGON</button></div>
    <div className="match-strip"><span>TEAM SHEET</span><b>{formationLabel(formation)} · {styles[playStyle]}</b><button className="submit-tactic" onClick={() => void prepare()}>PREPARE & VALIDATE</button></div>
    <div className="tactic-editor">
      <aside className="tactic-sidebar">
        <h3>TEAM INSTRUCTIONS</h3>
        <Field label="FORMATION"><select value={formation} onChange={(event) => setFormation(Number(event.target.value))}>{formations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
        <Field label="TACTIC"><select value={playStyle} onChange={(event) => setPlayStyle(Number(event.target.value))}>{styles.map((name, id) => <option key={name} value={id}>{name}</option>)}</select></Field>
        <Field label="RHYTHM"><select value={tempo} onChange={(event) => setTempo(Number(event.target.value))}><option value={0}>Slow</option><option value={1}>Normal</option><option value={2}>Fast</option></select></Field>
        <Field label="TACKLING"><select value={tackling} onChange={(event) => setTackling(Number(event.target.value))}><option value={0}>Light</option><option value={1}>Medium</option><option value={2}>Hard</option></select></Field>
        <Field label="CAPTAIN"><select value={roleId(captain) ?? ""} onChange={(event) => setCaptain(Number(event.target.value))}>{starters.map((id) => <option key={id} value={id}>{players.get(id)?.display_name}</option>)}</select></Field>
        <Field label="PENALTY TAKER"><select value={roleId(penaltyTaker) ?? ""} onChange={(event) => setPenaltyTaker(Number(event.target.value))}>{starters.map((id) => <option key={id} value={id}>{players.get(id)?.display_name}</option>)}</select></Field>
        <label className="hide-toggle"><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)}/> Hide tactics (commit/reveal)</label>
        <div className="situations"><header><b>SITUATIONS</b><button onClick={addSituation}>+ ADD</button></header>{situations.length === 0 && <p>No situation: the initial tactic is used throughout the match.</p>}{situations.map((situation) => <div className="situation" key={situation.id}><div><Field label="MIN"><input type="number" min="1" max="120" value={situation.minute} onChange={(event) => updateSituation(situation.id, "minute", Number(event.target.value))}/></Field><Field label="WHEN"><select value={situation.scoreCondition} onChange={(event) => updateSituation(situation.id, "scoreCondition", Number(event.target.value))}>{scoreConditions.map((label, id) => <option key={label} value={id}>{label}</option>)}</select></Field></div><Field label="FORMATION"><select value={situation.formationId} onChange={(event) => updateSituation(situation.id, "formationId", Number(event.target.value))}>{formations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field><Field label="TACTIC"><select value={situation.playStyle} onChange={(event) => updateSituation(situation.id, "playStyle", Number(event.target.value))}>{styles.map((name, id) => <option key={name} value={id}>{name}</option>)}</select></Field><button className="remove-situation" onClick={() => setSituations((current) => current.filter((item) => item.id !== situation.id))}>REMOVE</button></div>)}</div>
      </aside>
      <div className="pitch"><div className="pitch-title">STARTING XI <span>{activeSlot === null ? "tap a position, then a substitute" : "choose a player to replace this selected position"}</span></div>{coordinates(formation).map(([left, top], index) => { const player = players.get(starters[index]); return <button className={activeSlot === index ? "pitch-player selected-slot" : "pitch-player"} onClick={() => setActiveSlot(index)} style={{ left: `${left}%`, top: `${top}%` }} key={index}><b>{player?.rating ?? "—"}</b><span>{player?.position_main ?? "—"}</span><strong>{player?.display_name ?? "Empty"}</strong></button>; })}</div>
      <aside className="bench"><h3>SUBSTITUTES <span>{subs.length}/7</span></h3>{subs.map((id) => { const player = players.get(id); return <button key={id} onClick={() => replaceFromBench(id)}><b>{player?.rating}</b><span>{player?.position_main}</span><strong>{player?.display_name}</strong><i>{activeSlot === null ? "SELECT A PITCH SLOT" : "REPLACE SELECTED"}</i></button>; })}</aside>
    </div>
    <div className="player-picker"><header><b>CLUB SQUAD · PICK 18</b><span>Tap a selected position on the pitch then any player below to swap directly.</span></header><div>{squad.map((player) => { const index = selection.indexOf(player.player_id); return <button className={index < 0 ? "" : index < 11 ? "chosen starter" : "chosen"} key={player.player_id} onClick={() => togglePlayer(player.player_id)}><b>{player.rating}</b><span>{player.position_main}</span><strong>{player.display_name}</strong><i>{index < 0 ? "ADD" : index < 11 ? "XI" : "SUB"}</i></button>; })}</div></div>
    <p className="tactic-status">{status}</p>
    {prepared && <div className="tactic-actions"><button onClick={() => void execute(false)}>SIMULATE ON POLYGON</button><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/> I understand this creates a real Polygon transaction.</label><button className="live-action" disabled={!confirmed || chainId !== "0x89"} onClick={() => void execute(true)}>SUBMIT TACTICS</button></div>}
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="tactic-field"><span>{label}</span>{children}</label>; }
function formationLabel(id: number) { return formations.find(([formationId]) => formationId === id)?.[1] ?? "Custom"; }
function coordinates(id: number): Array<[number, number]> { const lines = ({ 0: [1, 4, 4, 2], 1: [1, 4, 3, 3], 2: [1, 4, 5, 1], 3: [1, 3, 4, 3], 4: [1, 3, 5, 2], 5: [1, 3, 3, 4], 6: [1, 5, 4, 1], 7: [1, 5, 3, 2], 8: [1, 5, 2, 3], 9: [1, 4, 1, 2, 1, 2], 10: [1, 4, 3, 3], 11: [1, 4, 5, 1], 12: [1, 4, 2, 3, 1], 13: [1, 4, 1, 2, 2, 1], 14: [1, 4, 4, 1, 1], 15: [1, 4, 3, 1, 2], 16: [1, 3, 4, 1, 2], 17: [1, 5, 1, 2, 2], 18: [1, 5, 3, 2], 19: [1, 4, 2, 4], 20: [1, 4, 2, 2, 2], 21: [1, 3, 4, 2, 1], 22: [1, 4, 1, 3, 2], 23: [1, 3, 2, 2, 2, 1] } as Record<number, number[]>)[id] ?? [1, 4, 3, 3]; return lines.flatMap((count, row) => Array.from({ length: count }, (_, index): [number, number] => [((index + 1) * 100) / (count + 1), 88 - row * (76 / Math.max(1, lines.length - 1))])); }
async function refreshChain(setChainId: (value: string | null) => void) { if (window.ethereum) setChainId(String(await window.ethereum.request({ method: "eth_chainId" }))); }
async function ensurePolygon() { if (!window.ethereum) throw new Error("MetaMask is unavailable."); if (await window.ethereum.request({ method: "eth_chainId" }) === "0x89") return; try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] }); } catch (error) { const code = error && typeof error === "object" && "code" in error ? (error as { code?: number }).code : undefined; if (code !== 4902) throw new Error("Switch MetaMask to Polygon before signing."); await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x89", chainName: "Polygon", nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 }, rpcUrls: ["https://polygon.drpc.org"], blockExplorerUrls: ["https://polygonscan.com"] }] }); await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] }); } if (await window.ethereum.request({ method: "eth_chainId" }) !== "0x89") throw new Error("MetaMask is not on Polygon."); }
