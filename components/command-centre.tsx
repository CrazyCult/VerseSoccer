"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClubSnapshot, WalletAccount } from "@/lib/soccerverse";

declare global {
  interface Window { ethereum?: { request: (request: { method: string }) => Promise<string[]> } }
}

type Widget = "club" | "squad" | "finance" | "market" | "account";
const defaultWidgets: Widget[] = ["club", "squad", "finance", "market", "account"];
const widgetLabels: Record<Widget, string> = {
  club: "Club command centre", squad: "Squad monitor", finance: "Finances", market: "Market pulse", account: "Wallet & account",
};

export function CommandCentre() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [snapshot, setSnapshot] = useState<ClubSnapshot | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [customizing, setCustomizing] = useState(false);
  const [message, setMessage] = useState("Connect a wallet to open your managed club.");

  const clubId = selectedAccount?.clubId ?? 15516;
  const storageKey = `versesoccer:widgets:${wallet ?? "public"}`;

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try { setWidgets(JSON.parse(saved) as Widget[]); } catch { setWidgets(defaultWidgets); }
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(widgets));
  }, [storageKey, widgets]);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    fetch(`/api/club/${clubId}`).then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: ClubSnapshot) => { if (!cancelled) setSnapshot(data); })
      .catch(() => { if (!cancelled) setMessage("Live club data is temporarily unavailable."); });
    return () => { cancelled = true; };
  }, [clubId]);

  async function connectWallet() {
    if (!window.ethereum) { setMessage("MetaMask is required to connect a wallet. WalletConnect will be added once its project key is configured."); return; }
    try {
      setMessage("Reading your Soccerverse accounts…");
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!address) throw new Error("No wallet selected");
      const response = await fetch(`/api/wallet/${address}`);
      const data = await response.json() as WalletAccount[] | { error: string };
      if (!response.ok || !Array.isArray(data)) throw new Error("Wallet lookup failed");
      setWallet(address);
      setAccounts(data);
      const managed = data.find((account) => account.clubId !== null) ?? null;
      setSelectedAccount(managed);
      setMessage(managed ? `Opened ${managed.name}'s managed club.` : "No managed club was found in this wallet.");
    } catch {
      setMessage("Connection cancelled or the wallet could not be resolved.");
    }
  }

  function toggleWidget(widget: Widget) {
    setWidgets((current) => current.includes(widget) ? current.filter((item) => item !== widget) : [...current, widget]);
  }

  const club = snapshot?.club;
  const squad = snapshot?.squad ?? [];
  const metrics = useMemo(() => [
    ["CLUB BALANCE", club ? svc(club.balance) : "…", "green"],
    ["AVG. RATING", club?.avg_player_rating_top21 ?? "…", "blue"],
    ["TEAM FITNESS", snapshot ? `${snapshot.averageFitness}%` : "…", "green"],
    ["FANS", club ? number(club.fans_current) : "…", ""],
    ["LEAGUE POSITION", club?.league_position ? `#${club.league_position}` : "—", "gold"],
  ], [club, snapshot]);

  return <main className="shell">
    <header className="topbar"><a className="brand" href="/">SOCCER<span>VERSE</span></a><nav>{["HOME", "WORLD", "TRANSFERS", "INFLUENCE", "VOTES", "DATABASE"].map((item, index) => <a className={index === 0 ? "active" : ""} href="#" key={item}>{item}</a>)}</nav><button className="wallet-button" onClick={connectWallet}>{wallet ? short(wallet) : "CONNECT WALLET"}</button></header>

    <section className="intro"><div><p className="eyebrow">{wallet ? `WALLET ${short(wallet)} / ${selectedAccount?.name ?? "NO MANAGED ACCOUNT"}` : "PUBLIC PREVIEW / CONNECT TO PERSONALISE"}</p><h1>{club ? `MANAGING CLUB #${club.club_id}` : "SOCCERVERSE COMMAND CENTRE"}</h1><p className="message">{message}</p></div><div className="intro-actions"><button className="outline-button" onClick={() => setCustomizing((value) => !value)}>⚙ CUSTOMISE WIDGETS</button>{accounts.length > 1 && <select value={selectedAccount?.name ?? ""} onChange={(event) => setSelectedAccount(accounts.find((account) => account.name === event.target.value) ?? null)}>{accounts.map((account) => <option key={account.name} value={account.name}>{account.name}{account.clubId ? ` · club #${account.clubId}` : " · no club"}</option>)}</select>}</div></section>
    {customizing && <section className="customizer"><b>YOUR HOME PAGE</b><span>Widgets are saved locally for this wallet.</span>{(Object.keys(widgetLabels) as Widget[]).map((widget) => <label key={widget}><input type="checkbox" checked={widgets.includes(widget)} onChange={() => toggleWidget(widget)} /> {widgetLabels[widget]}</label>)}</section>}
    <section className="metrics">{metrics.map(([label, value, tone]) => <div key={String(label)}><small>{label}</small><strong className={String(tone)}>{value}</strong></div>)}</section>
    <section className="dashboard">
      {widgets.includes("club") && <article className="panel club-panel"><PanelTitle title="CLUB COMMAND CENTRE" detail={club ? `DIVISION ${club.division} · LEAGUE ${club.league_id}` : "LOADING LIVE DATA"}/><div className="fixture"><strong>{club?.manager_name ?? "Live club profile"}</strong><div className="teams"><span><i className="crest">SV</i>{club ? `CLUB #${club.club_id}` : "SOCCERVERSE"}</span><b>●</b><span><i className="crest away">FC</i>{club ? `${number(club.stadium_size_current)} SEATS` : "CONNECT WALLET"}</span></div><small>{club ? `CURRENT FORM: ${club.form || "—"}` : "Club details will appear here."}</small></div><a className="action link-action" href={club ? `https://play.soccerverse.com/club/${club.club_id}` : "https://play.soccerverse.com"} target="_blank">OPEN OFFICIAL CLUB PAGE →</a></article>}
      {widgets.includes("squad") && <article className="panel"><PanelTitle title="SQUAD MONITOR" detail={`${squad.length} PLAYERS · REAL NAMES FROM DATAPACK`}/><div className="squad-list">{squad.slice(0, 6).map((player, index) => <div className={index % 3 === 0 ? "row cyan" : index % 3 === 1 ? "row gold" : "row green"} key={player.player_id}><i/><div><b>{player.display_name}</b><small>{player.position_main} · fitness {player.fitness}%</small></div><strong>{player.rating}</strong></div>)}</div><div className="node-note"><b>DATAPACK ACTIVE</b><br/>Names are resolved from the custom Soccerverse datapack; game ratings remain live API data.</div></article>}
      {widgets.includes("finance") && <article className="panel"><PanelTitle title="FINANCES" detail="LIVE CLUB DATA"/><div className="stat-stack"><Stat label="CLUB BALANCE" value={club ? svc(club.balance) : "…"}/><Stat label="TOTAL WAGES" value={club ? svc(club.total_wages ?? 0) : "…"}/><Stat label="SQUAD VALUE" value={club ? svc(club.total_player_value ?? 0) : "…"}/><Stat label="MANAGER ACCOUNT" value={selectedAccount ? svc(selectedAccount.balance ?? 0) : "CONNECT"}/></div></article>}
      {widgets.includes("market") && <article className="panel"><PanelTitle title="MARKET PULSE" detail="CLUB INFLUENCE"/><div className="market-price">{club ? svc(club.last_price ?? 0) : "…"}<span>LAST PRICE</span></div><div className="market-line"><i/><i/><i/><i/><i/><i/></div><div className="split-stat"><span>7D VOLUME <b>{club ? svc(club.volume_7_day ?? 0) : "…"}</b></span><span>FORM <b>{club?.form || "—"}</b></span></div></article>}
      {widgets.includes("account") && <article className="panel"><PanelTitle title="WALLET & ACCOUNTS" detail={wallet ? `${accounts.length} XAYA NAMES` : "NOT CONNECTED"}/>{wallet ? <><p className="wallet-address">{wallet}</p><div className="account-list">{accounts.slice(0, 5).map((account) => <button key={account.name} className={account.name === selectedAccount?.name ? "account active-account" : "account"} onClick={() => setSelectedAccount(account)}><b>{account.name}</b><span>{account.clubId ? `MANAGES CLUB #${account.clubId}` : "NO MANAGED CLUB"}</span></button>)}</div></> : <><p className="empty-copy">Connect MetaMask: VerseSoccer will only read your public Xaya names, find the account that manages a club, then open that club automatically.</p><button className="action" onClick={connectWallet}>CONNECT METAMASK</button></>}</article>}
    </section>
  </main>;
}

function PanelTitle({ title, detail }: { title: string; detail: string }) { return <header className="panel-title"><h2>{title}</h2><span>{detail}</span></header>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat"><small>{label}</small><b>{value}</b></div>; }
function svc(value: number) { return `SVC ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value / 10_000)}`; }
function number(value: number) { return new Intl.NumberFormat("en").format(value); }
function short(address: string) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }
