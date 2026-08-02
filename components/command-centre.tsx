"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClubSnapshot, WalletAccount } from "@/lib/soccerverse";

declare global {
  interface Window { ethereum?: { request: (request: { method: string }) => Promise<string[]> } }
}

type Widget = "club" | "stadium" | "league" | "influencers" | "trades" | "news" | "chat" | "votes" | "market" | "squad" | "finance" | "account";
const defaultWidgets: Widget[] = ["club", "stadium", "league", "influencers", "trades", "news", "chat", "votes", "market", "squad", "finance", "account"];
const widgetLabels: Record<Widget, string> = {
  club: "Club description", stadium: "Stadium & matches", league: "League table", influencers: "Top influencers", trades: "Latest trades", news: "Latest news", chat: "Club chat", votes: "Proposals & votes", market: "Price & volume", squad: "Squad monitor", finance: "Finances", account: "Wallet & accounts",
};

export function CommandCentre() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [snapshot, setSnapshot] = useState<ClubSnapshot | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [customizing, setCustomizing] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
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

  async function resolveWallet(address: string) {
    try {
      setMessage("Reading your Soccerverse accounts…");
      const response = await fetch(`/api/wallet/${address}`);
      const data = await response.json() as WalletAccount[] | { error: string };
      if (!response.ok || !Array.isArray(data)) throw new Error("Wallet lookup failed");
      setWallet(address);
      setManualMode(false);
      setAccounts(data);
      const managed = data.find((account) => account.clubId !== null) ?? null;
      setSelectedAccount(managed);
      setMessage(managed ? `Opened ${managed.name}'s managed club.` : "No managed club was found in this wallet.");
    } catch {
      setMessage("Connection cancelled or the wallet could not be resolved.");
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setManualMode(true);
      setMessage("MetaMask is not available in this browser. Paste a public wallet address to open its Soccerverse accounts in read-only mode.");
      return;
    }
    try {
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!address) throw new Error("No wallet selected");
      await resolveWallet(address);
    } catch {
      setMessage("Connection cancelled or the wallet could not be resolved.");
    }
  }

  function toggleWidget(widget: Widget) {
    setWidgets((current) => current.includes(widget) ? current.filter((item) => item !== widget) : [...current, widget]);
  }

  function widgetProps(widget: Widget) {
    return {
      draggable: true,
      style: { order: widgets.indexOf(widget) },
      onDragStart: () => setDraggedWidget(widget),
      onDragOver: (event: React.DragEvent<HTMLElement>) => event.preventDefault(),
      onDrop: () => {
        if (!draggedWidget || draggedWidget === widget) return;
        setWidgets((current) => {
          const next = current.filter((item) => item !== draggedWidget);
          next.splice(next.indexOf(widget), 0, draggedWidget);
          return next;
        });
        setDraggedWidget(null);
      },
    };
  }

  const club = snapshot?.club;
  const presentation = snapshot?.presentation;
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

    <section className="intro"><div><p className="eyebrow">{wallet ? `WALLET ${short(wallet)} / ${selectedAccount?.name ?? "NO MANAGED ACCOUNT"}` : "PUBLIC PREVIEW / CONNECT TO PERSONALISE"}</p><h1>{club ? `MANAGING CLUB #${club.club_id}` : "SOCCERVERSE COMMAND CENTRE"}</h1><p className="message">{message}</p>{manualMode && <form className="manual-wallet" onSubmit={(event) => { event.preventDefault(); void resolveWallet(manualAddress.trim()); }}><input aria-label="Public wallet address" value={manualAddress} onChange={(event) => setManualAddress(event.target.value)} placeholder="0x… public Polygon wallet address" pattern="0x[a-fA-F0-9]{40}" required/><button type="submit">OPEN THIS WALLET</button></form>}</div><div className="intro-actions"><button className="outline-button" onClick={() => setCustomizing((value) => !value)}>⚙ CUSTOMISE WIDGETS</button>{accounts.length > 1 && <select value={selectedAccount?.name ?? ""} onChange={(event) => setSelectedAccount(accounts.find((account) => account.name === event.target.value) ?? null)}>{accounts.map((account) => <option key={account.name} value={account.name}>{account.name}{account.clubId ? ` · club #${account.clubId}` : " · no club"}</option>)}</select>}</div></section>
    {customizing && <section className="customizer"><b>YOUR HOME PAGE</b><span>Widgets are saved locally for this wallet.</span>{(Object.keys(widgetLabels) as Widget[]).map((widget) => <label key={widget}><input type="checkbox" checked={widgets.includes(widget)} onChange={() => toggleWidget(widget)} /> {widgetLabels[widget]}</label>)}</section>}
    {club && <nav className="club-tabs">{["OVERVIEW", "SQUAD", "TACTICS", "FINANCES", "TRANSFERS", "VOTES", "HISTORY"].map((tab, index) => <button key={tab} className={index === 0 ? "selected" : ""} onClick={() => setMessage(`${tab} is the next dedicated club workspace.`)}>{tab}</button>)}</nav>}
    <section className="metrics">{metrics.map(([label, value, tone]) => <div key={String(label)}><small>{label}</small><strong className={String(tone)}>{value}</strong></div>)}</section>
    <section className="dashboard">
      {widgets.includes("club") && <article className="panel club-panel" {...widgetProps("club")}><PanelTitle title="CLUB DESCRIPTION" detail={club ? `DIVISION ${club.division} · ${presentation?.leagueName}` : "LOADING LIVE DATA"}/><div className="club-description"><img src={presentation?.clubBadgeUrl} alt=""/><div><strong>{presentation?.clubName ?? "Live club profile"}</strong><p>{club?.country_id} · ID {club?.club_id} · Position {club?.league_position}</p><p className="form">{club?.form || "—"}</p><p>Manager: <b>{club?.manager_name}</b> · Transfers in: {club?.transfers_in ?? 0} · out: {club?.transfers_out ?? 0}</p></div></div><a className="action link-action" href={club ? `https://play.soccerverse.com/club/${club.club_id}` : "https://play.soccerverse.com"} target="_blank">OPEN OFFICIAL CLUB PAGE →</a></article>}
      {widgets.includes("stadium") && <article className="panel club-panel" {...widgetProps("stadium")}><PanelTitle title="STADIUM & MATCHES" detail={`${number(club?.stadium_size_current ?? 0)} CAPACITY · ${number(club?.fans_current ?? 0)} FANS`}/><div className="stadium"><img src={presentation?.stadiumImageUrl} alt=""/><div><b>{presentation?.stadiumName}</b><MatchList fixtures={snapshot?.fixtures ?? []} presentation={presentation}/></div></div></article>}
      {widgets.includes("league") && <article className="panel" {...widgetProps("league")}><PanelTitle title={presentation?.leagueName ?? "LEAGUE TABLE"} detail="LIVE TABLE"/><div className="table-head"><span># CLUB</span><span>P W D L PTS</span></div>{(snapshot?.leagueTable ?? []).slice(0, 8).map((row) => <div className={row.club_id === club?.club_id ? "league-row current" : "league-row"} key={row.club_id}><span>{row.new_position} <img src={presentation?.clubBadges[row.club_id]} alt=""/> {presentation?.clubNames[row.club_id]}</span><span>{row.played} {row.won} {row.drawn} {row.lost} <b>{row.pts}</b></span></div>)}</article>}
      {widgets.includes("influencers") && <article className="panel" {...widgetProps("influencers")}><PanelTitle title="TOP INFLUENCERS" detail={`${snapshot?.influencers.length ?? 0} HOLDERS`}/>{(snapshot?.influencers ?? []).slice(0, 6).map((holder, index) => <div className="compact-row" key={holder.name}><span>#{index + 1} {holder.name}</span><b>{number(holder.num)}</b></div>)}</article>}
      {widgets.includes("trades") && <article className="panel" {...widgetProps("trades")}><PanelTitle title="LATEST TRADES" detail="CLUB INFLUENCE"/>{(snapshot?.trades ?? []).slice(0, 6).map((trade) => <div className="compact-row" key={trade.id}><span>{trade.seller} → <b>{trade.buyer}</b><small>{number(trade.num)} influence · {shortDate(trade.time)}</small></span><b>{svc(trade.price)}</b></div>)}</article>}
      {widgets.includes("news") && <article className="panel" {...widgetProps("news")}><PanelTitle title="LATEST NEWS" detail="CLUB EVENTS"/>{(snapshot?.news ?? []).slice(0, 4).map((news) => <div className="news-row" key={news.id}><b>CONTRACT</b><span><strong>{news.playerName}</strong> {news.text}</span></div>)}</article>}
      {widgets.includes("chat") && <article className="panel" {...widgetProps("chat")}><PanelTitle title="CLUB CHAT" detail="COMING NEXT"/><p className="empty-copy">Club chat needs the authenticated Soccerverse messaging channel. This widget is ready for that connection; it does not fake messages.</p><button className="action" onClick={() => setMessage("Chat integration requires the official authenticated channel.")}>OPEN CLUB CHAT</button></article>}
      {widgets.includes("votes") && <article className="panel" {...widgetProps("votes")}><PanelTitle title="ACTIVE PROPOSALS" detail="VOTES"/><p className="empty-copy">No active proposals returned for this club.</p><button className="action" onClick={() => setMessage("The vote workspace will use the on-chain move composer.")}>VIEW ALL VOTES</button></article>}
      {widgets.includes("squad") && <article className="panel"><PanelTitle title="SQUAD MONITOR" detail={`${squad.length} PLAYERS · REAL NAMES FROM DATAPACK`}/><div className="squad-list">{squad.slice(0, 6).map((player, index) => <div className={index % 3 === 0 ? "row cyan" : index % 3 === 1 ? "row gold" : "row green"} key={player.player_id}><i/><div><b>{player.display_name}</b><small>{player.position_main} · fitness {player.fitness}%</small></div><strong>{player.rating}</strong></div>)}</div><div className="node-note"><b>DATAPACK ACTIVE</b><br/>Names are resolved from the custom Soccerverse datapack; game ratings remain live API data.</div></article>}
      {widgets.includes("finance") && <article className="panel"><PanelTitle title="FINANCES" detail="LIVE CLUB DATA"/><div className="stat-stack"><Stat label="CLUB BALANCE" value={club ? svc(club.balance) : "…"}/><Stat label="TOTAL WAGES" value={club ? svc(club.total_wages ?? 0) : "…"}/><Stat label="SQUAD VALUE" value={club ? svc(club.total_player_value ?? 0) : "…"}/><Stat label="MANAGER ACCOUNT" value={selectedAccount ? svc(selectedAccount.balance ?? 0) : "CONNECT"}/></div></article>}
      {widgets.includes("market") && <article className="panel"><PanelTitle title="MARKET PULSE" detail="CLUB INFLUENCE"/><div className="market-price">{club ? svc(club.last_price ?? 0) : "…"}<span>LAST PRICE</span></div><div className="market-line"><i/><i/><i/><i/><i/><i/></div><div className="split-stat"><span>7D VOLUME <b>{club ? svc(club.volume_7_day ?? 0) : "…"}</b></span><span>FORM <b>{club?.form || "—"}</b></span></div></article>}
      {widgets.includes("account") && <article className="panel"><PanelTitle title="WALLET & ACCOUNTS" detail={wallet ? `${accounts.length} XAYA NAMES` : "NOT CONNECTED"}/>{wallet ? <><p className="wallet-address">{wallet}</p><div className="account-list">{accounts.slice(0, 5).map((account) => <button key={account.name} className={account.name === selectedAccount?.name ? "account active-account" : "account"} onClick={() => setSelectedAccount(account)}><b>{account.name}</b><span>{account.clubId ? `MANAGES CLUB #${account.clubId}` : "NO MANAGED CLUB"}</span></button>)}</div></> : <><p className="empty-copy">Connect MetaMask: VerseSoccer will only read your public Xaya names, find the account that manages a club, then open that club automatically.</p><button className="action" onClick={connectWallet}>CONNECT METAMASK</button></>}</article>}
    </section>
    {wallet && <CommandDeck onSelect={(command) => setMessage(`${command}: preflight is prepared. The exact Xaya move must be validated against the official command schema before MetaMask can sign it.`)}/>}
  </main>;
}

function PanelTitle({ title, detail }: { title: string; detail: string }) { return <header className="panel-title"><h2>{title}</h2><span>{detail}</span></header>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat"><small>{label}</small><b>{value}</b></div>; }
function svc(value: number) { return `SVC ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value / 10_000)}`; }
function number(value: number) { return new Intl.NumberFormat("en").format(value); }
function short(address: string) { return `${address.slice(0, 6)}…${address.slice(-4)}`; }
function shortDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(value)); }
function MatchList({ fixtures, presentation }: { fixtures: import("@/lib/soccerverse").Fixture[]; presentation?: import("@/lib/soccerverse").Presentation }) {
  const matches = fixtures.slice(-4);
  if (!matches.length) return <p className="empty-copy">Fixtures are loading from the Soccerverse game-state service.</p>;
  return <div className="match-list">{matches.map((fixture) => <div className="match-row" key={fixture.fixture_id}><small>{new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(new Date(fixture.date * 1000))}</small><b>{presentation?.clubNames[fixture.home_club] ?? `Club #${fixture.home_club}`} {fixture.played ? `${fixture.home_goals} - ${fixture.away_goals}` : "–"} {presentation?.clubNames[fixture.away_club] ?? `Club #${fixture.away_club}`}</b></div>)}</div>;
}
function CommandDeck({ onSelect }: { onSelect: (command: string) => void }) {
  const commands = [
    ["TACTICS", "Submit team sheet · hide / reveal tactics"],
    ["TRANSFERS", "Bid · auction · loan · contract"],
    ["CLUB FINANCE", "Inject funds · resign manager"],
    ["INFLUENCE", "Buy / sell orders · packs"],
    ["GOVERNANCE", "Propose · vote · unlock manager"],
  ];
  return <section className="command-deck"><header><b>ON-CHAIN COMMAND DECK</b><span>Every live command requires a final wallet signature.</span></header><div>{commands.map(([title, description]) => <button key={title} onClick={() => onSelect(title)}><b>{title}</b><span>{description}</span><i>PREPARE →</i></button>)}</div></section>;
}
