"use client";

import { useEffect, useState } from "react";
import type { ClubSnapshot, WalletAccount } from "@/lib/soccerverse";
import { composeXayaMove, createTacticDraft, importPendingTactic, XAYA_ACCOUNTS_ADDRESS } from "@/lib/xaya";
import { TacticWorkbench } from "@/components/tactic-workbench";

declare global {
  interface Window { ethereum?: { request: (request: { method: string; params?: unknown[] }) => Promise<unknown> } }
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
  const [activeTab, setActiveTab] = useState("OVERVIEW");

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
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
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
  const accountLabel = (account: WalletAccount) => `${account.name} · ${account.name === selectedAccount?.name ? presentation?.clubName ?? `club #${account.clubId}` : `club #${account.clubId}`}`;
  return <main className="shell">
    <header className="topbar"><a className="brand" href="/">SOCCER<span>VERSE</span></a><nav>{["HOME", "WORLD", "TRANSFERS", "INFLUENCE", "VOTES", "DATABASE"].map((item, index) => <a className={index === 0 ? "active" : ""} href="#" key={item}>{item}</a>)}</nav>{accounts.length > 0 && <select className="top-account-select" value={selectedAccount?.name ?? ""} onChange={(event) => setSelectedAccount(accounts.find((account) => account.name === event.target.value) ?? null)}>{accounts.map((account) => <option key={account.name} value={account.name}>{accountLabel(account)}</option>)}</select>}<button className="wallet-button" onClick={connectWallet}>{wallet ? short(wallet) : "CONNECT WALLET"}</button></header>

    {club ? <ClubHeader club={club} presentation={presentation} /> : <section className="intro"><div><p className="eyebrow">{wallet ? `WALLET ${short(wallet)} / ${selectedAccount?.name ?? "NO MANAGED ACCOUNT"}` : "PUBLIC PREVIEW / CONNECT TO PERSONALISE"}</p><h1>SOCCERVERSE COMMAND CENTRE</h1><p className="message">{message}</p>{manualMode && <form className="manual-wallet" onSubmit={(event) => { event.preventDefault(); void resolveWallet(manualAddress.trim()); }}><input aria-label="Public wallet address" value={manualAddress} onChange={(event) => setManualAddress(event.target.value)} placeholder="0x… public Polygon wallet address" pattern="0x[a-fA-F0-9]{40}" required/><button type="submit">OPEN THIS WALLET</button></form>}</div><div className="intro-actions"><button className="outline-button" onClick={() => setCustomizing((value) => !value)}>⚙ CUSTOMISE WIDGETS</button>{accounts.length > 1 && <select value={selectedAccount?.name ?? ""} onChange={(event) => setSelectedAccount(accounts.find((account) => account.name === event.target.value) ?? null)}>{accounts.map((account) => <option key={account.name} value={account.name}>{account.name}{account.clubId ? ` · club #${account.clubId}` : " · no club"}</option>)}</select>}</div></section>}
    {club && <nav className="club-tabs">{["OVERVIEW", "SQUAD", "TACTICS", "FINANCES", "TRANSFERS", "VOTES", "HISTORY"].map((tab) => <button key={tab} className={activeTab === tab ? "selected" : ""} onClick={() => { setActiveTab(tab); if (tab !== "TACTICS") setMessage(`${tab} workspace is being connected to the same live club data.`); }}>{tab}</button>)}</nav>}
    {activeTab === "OVERVIEW" && <section className="overview-tools"><span>{message}</span><button className="outline-button" onClick={() => setCustomizing((value) => !value)}>⚙ CUSTOMISE WIDGETS</button></section>}
    {activeTab === "OVERVIEW" && customizing && <section className="customizer"><b>YOUR HOME PAGE</b><span>Widgets are saved locally for this wallet.</span>{(Object.keys(widgetLabels) as Widget[]).map((widget) => <label key={widget}><input type="checkbox" checked={widgets.includes(widget)} onChange={() => toggleWidget(widget)} /> {widgetLabels[widget]}</label>)}</section>}
    {activeTab === "TACTICS" && <TacticWorkbench wallet={wallet} accountName={selectedAccount?.name ?? null} clubId={clubId} squad={squad} fixtures={snapshot?.fixtures ?? []} presentation={presentation} onMessage={setMessage}/>}
    {activeTab !== "OVERVIEW" && activeTab !== "TACTICS" && <section className="workspace-empty"><b>{activeTab}</b><span>This dedicated club workspace is next. The overview widgets stay on the club home page.</span></section>}
    {activeTab === "OVERVIEW" && <section className="dashboard">
      {widgets.includes("club") && <article className="panel club-panel" {...widgetProps("club")}><PanelTitle title="CLUB DESCRIPTION" detail={club ? `DIVISION ${club.division} · ${presentation?.leagueName}` : "LOADING LIVE DATA"}/><div className="club-description"><img src={presentation?.clubBadgeUrl} alt=""/><div><strong>{presentation?.clubName ?? "Live club profile"}</strong><p>{club?.country_id} · ID {club?.club_id} · Position {club?.league_position}</p><p className="form">{club?.form || "—"}</p><p>Manager: <b>{club?.manager_name}</b> · Transfers in: {club?.transfers_in ?? 0} · out: {club?.transfers_out ?? 0}</p></div></div><a className="action link-action" href={club ? `https://play.soccerverse.com/club/${club.club_id}` : "https://play.soccerverse.com"} target="_blank">OPEN OFFICIAL CLUB PAGE →</a></article>}
      {widgets.includes("stadium") && <article className="panel club-panel" {...widgetProps("stadium")}><PanelTitle title="STADIUM & MATCHES" detail={`${number(club?.stadium_size_current ?? 0)} CAPACITY · ${number(club?.fans_current ?? 0)} FANS`}/><div className="stadium"><img src={presentation?.stadiumImageUrl} alt=""/><div><b>{presentation?.stadiumName}</b><MatchList fixtures={snapshot?.fixtures ?? []} presentation={presentation}/></div></div></article>}
      {widgets.includes("league") && <article className="panel" {...widgetProps("league")}><PanelTitle title={presentation?.leagueName ?? "LEAGUE TABLE"} detail="LIVE TABLE"/><div className="table-head"><span># CLUB</span><span>P W D L PTS</span></div>{(snapshot?.leagueTable ?? []).slice(0, 8).map((row) => <div className={row.club_id === club?.club_id ? "league-row current" : "league-row"} key={row.club_id}><span>{row.new_position} <img src={presentation?.clubBadges[row.club_id]} alt=""/> {presentation?.clubNames[row.club_id]}</span><span>{row.played} {row.won} {row.drawn} {row.lost} <b>{row.pts}</b></span></div>)}</article>}
      {widgets.includes("influencers") && <article className="panel" {...widgetProps("influencers")}><PanelTitle title="TOP INFLUENCERS" detail={`${snapshot?.influencers.length ?? 0} HOLDERS`}/>{(snapshot?.influencers ?? []).slice(0, 6).map((holder, index) => <div className="compact-row" key={holder.name}><span>#{index + 1} {holder.name}</span><b>{number(holder.num)}</b></div>)}</article>}
      {widgets.includes("trades") && <article className="panel" {...widgetProps("trades")}><PanelTitle title="LATEST TRADES" detail="CLUB INFLUENCE"/>{(snapshot?.trades ?? []).slice(0, 6).map((trade) => <div className="compact-row" key={trade.id}><span>{trade.seller} → <b>{trade.buyer}</b><small>{number(trade.num)} influence · {shortDate(trade.time)}</small></span><b>{svc(trade.price)}</b></div>)}</article>}
      {widgets.includes("news") && <article className="panel" {...widgetProps("news")}><PanelTitle title="LATEST NEWS" detail="CLUB EVENTS"/>{(snapshot?.news ?? []).slice(0, 4).map((news) => <div className="news-row" key={news.id}><b>CONTRACT</b><span><strong>{news.playerName}</strong> {news.text}</span></div>)}</article>}
      {widgets.includes("chat") && <article className="panel" {...widgetProps("chat")}><PanelTitle title="CLUB CHAT" detail="COMING NEXT"/><p className="empty-copy">Club chat needs the authenticated Soccerverse messaging channel. This widget is ready for that connection; it does not fake messages.</p><button className="action" onClick={() => setMessage("Chat integration requires the official authenticated channel.")}>OPEN CLUB CHAT</button></article>}
      {widgets.includes("votes") && <article className="panel" {...widgetProps("votes")}><PanelTitle title="ACTIVE PROPOSALS" detail="VOTES"/><p className="empty-copy">No active proposals returned for this club.</p><button className="action" onClick={() => setMessage("The vote workspace will use the on-chain move composer.")}>VIEW ALL VOTES</button></article>}
      {widgets.includes("squad") && <article className="panel" {...widgetProps("squad")}><PanelTitle title="SQUAD MONITOR" detail={`${squad.length} PLAYERS · REAL NAMES FROM DATAPACK`}/><div className="squad-list">{squad.slice(0, 6).map((player, index) => <div className={index % 3 === 0 ? "row cyan" : index % 3 === 1 ? "row gold" : "row green"} key={player.player_id}><i/><div><b>{player.display_name}</b><small>{player.position_main} · fitness {player.fitness}%</small></div><strong>{player.rating}</strong></div>)}</div><div className="node-note"><b>DATAPACK ACTIVE</b><br/>Names are resolved from the custom Soccerverse datapack; game ratings remain live API data.</div></article>}
      {widgets.includes("finance") && <article className="panel" {...widgetProps("finance")}><PanelTitle title="FINANCES" detail="LIVE CLUB DATA"/><div className="stat-stack"><Stat label="CLUB BALANCE" value={club ? svc(club.balance) : "…"}/><Stat label="TOTAL WAGES" value={club ? svc(club.total_wages ?? 0) : "…"}/><Stat label="SQUAD VALUE" value={club ? svc(club.total_player_value ?? 0) : "…"}/><Stat label="MANAGER ACCOUNT" value={selectedAccount ? svc(selectedAccount.balance ?? 0) : "CONNECT"}/></div></article>}
      {widgets.includes("market") && <article className="panel" {...widgetProps("market")}><PanelTitle title="MARKET PULSE" detail="CLUB INFLUENCE"/><div className="market-price">{club ? svc(club.last_price ?? 0) : "…"}<span>LAST PRICE</span></div><div className="market-line"><i/><i/><i/><i/><i/><i/></div><div className="split-stat"><span>7D VOLUME <b>{club ? svc(club.volume_7_day ?? 0) : "…"}</b></span><span>FORM <b>{club?.form || "—"}</b></span></div></article>}
      {widgets.includes("account") && <article className="panel" {...widgetProps("account")}><PanelTitle title="WALLET & ACCOUNTS" detail={wallet ? `${accounts.length} XAYA NAMES` : "NOT CONNECTED"}/>{wallet ? <><p className="wallet-address">{wallet}</p><div className="account-list">{accounts.slice(0, 5).map((account) => <button key={account.name} className={account.name === selectedAccount?.name ? "account active-account" : "account"} onClick={() => setSelectedAccount(account)}><b>{account.name}</b><span>{account.clubId ? `MANAGES CLUB #${account.clubId}` : "NO MANAGED CLUB"}</span></button>)}</div></> : <><p className="empty-copy">Connect MetaMask: VerseSoccer will only read your public Xaya names, find the account that manages a club, then open that club automatically.</p><button className="action" onClick={connectWallet}>CONNECT METAMASK</button></>}</article>}
    </section>}
    {activeTab === "OVERVIEW" && wallet && <CommandDeck onSelect={(command) => { if (command === "TACTICS") setActiveTab("TACTICS"); setMessage(`${command}: payload catalogue opened. Tactics are fully preflighted; the other game commands are documented but remain intentionally disabled until each rule is validated.`); }}/>}
  </main>;
}

function PanelTitle({ title, detail }: { title: string; detail: string }) { return <header className="panel-title"><h2>{title}</h2><span>{detail}</span></header>; }
function ClubHeader({ club, presentation }: { club: import("@/lib/soccerverse").Club; presentation?: import("@/lib/soccerverse").Presentation }) { const stats = [["LAST PRICE", svc(club.last_price ?? 0), "last trade"], ["MARKET CAP", svc((club.last_price ?? 0) * 1_000_000), "derived from club price"], ["CLUB BALANCE", svc(club.balance), "live balance"], ["TOTAL WAGE", svc(club.total_wages ?? 0), "weekly"], ["TOP 21 AVG", String(club.avg_player_rating_top21 ?? "—"), "squad rating"]]; return <section className="club-command-header"><div className="club-identity"><img src={presentation?.clubBadgeUrl} alt=""/><div><h1>{presentation?.clubName ?? `Club #${club.club_id}`}</h1><p>🇮🇳 {club.country_id} <i/> ID {club.club_id} <i/> Position <b>{club.league_position ?? "—"}</b> <em>{club.form?.replace(/-/g, "")}</em></p><p><strong>{presentation?.leagueName ?? `${club.country_id} Division`}</strong> <span>Transfers: In {club.transfers_in ?? 0} · Out {club.transfers_out ?? 0}</span></p><p>Manager: <b>{club.manager_name ?? "—"}</b> <mark>Active today</mark></p></div></div><div className="club-header-stats">{stats.map(([label, value, hint]) => <div key={label}><small>{label}</small><b>{value}</b><span>{hint}</span></div>)}</div></section>; }
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
function LegacyTacticWorkbench({ wallet, accountName, clubId, squad, onMessage }: { wallet: string | null; accountName: string | null; clubId: number; squad: import("@/lib/soccerverse").Player[]; onMessage: (value: string) => void }) {
  const [formation, setFormation] = useState(12);
  const [style, setStyle] = useState(0);
  const [mode, setMode] = useState<"public" | "commit">("public");
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof createTacticDraft>> | null>(null);
  const [pendingJson, setPendingJson] = useState("");
  const [importedPending, setImportedPending] = useState(false);
  const [selection, setSelection] = useState<number[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [cornerId, setCornerId] = useState<number | null>(null);
  const [freeKickId, setFreeKickId] = useState<number | null>(null);
  const [penaltyId, setPenaltyId] = useState<number | null>(null);
  const [tempo, setTempo] = useState(2);
  const [tackling, setTackling] = useState(2);
  const [activePitchSlot, setActivePitchSlot] = useState<number | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [status, setStatus] = useState("Prepare a team sheet: no transaction has been requested.");
  const [confirmed, setConfirmed] = useState(false);
  const draftKey = `versesoccer:tactic:${wallet}:${clubId}`;
  const refreshChain = async () => { if (window.ethereum) setChainId(String(await window.ethereum.request({ method: "eth_chainId" }))); };
  useEffect(() => { void refreshChain(); }, []);
  useEffect(() => {
    if (selection.length || !squad.length) return;
    const rank = (position: string) => position === "GK" ? 0 : /B|D/.test(position) ? 1 : /M/.test(position) ? 2 : 3;
    setSelection([...squad].sort((left, right) => rank(left.position_main) - rank(right.position_main) || right.rating - left.rating).slice(0, 18).map((player) => player.player_id));
  }, [selection.length, squad]);
  const players = new Map(squad.map((player) => [player.player_id, player]));
  const starters = selection.slice(0, 11);
  const substitutes = selection.slice(11, 18);
  const rolePlayer = (id: number | null) => starters.includes(id ?? -1) ? id as number : starters[0];
  const roleIndex = (id: number | null) => Math.max(0, starters.indexOf(rolePlayer(id)));
  const choosePlayer = (playerId: number) => setSelection((current) => {
    if (current.includes(playerId)) return current.filter((id) => id !== playerId);
    if (current.length >= 18) { setStatus("18 joueurs maximum : retire un joueur avant d’en ajouter un."); return current; }
    return [...current, playerId];
  });
  const promote = (playerId: number) => setSelection((current) => {
    const index = current.indexOf(playerId);
    if (index < 0 || index < 11 || current.length < 11) return current;
    const target = activePitchSlot === null ? 10 : activePitchSlot;
    const next = [...current]; [next[target], next[index]] = [next[index], next[target]]; setActivePitchSlot(null); return next;
  });
  async function prepare() {
    try {
      if (selection.length !== 18 || starters.length !== 11) throw new Error("Sélectionne exactement 18 joueurs, dont 11 titulaires.");
      const draft = await createTacticDraft(selection, { formationId: formation, playStyle: style, captain: roleIndex(captainId), cornerTaker: roleIndex(cornerId), freeKickTaker: roleIndex(freeKickId), penaltyTaker: roleIndex(penaltyId), tempo, tackling }, clubId);
      setPrepared(draft); setImportedPending(false); setStatus(`${mode === "commit" ? "Hidden commit" : "Public team sheet"} prepared with 18 players. Review and simulate it before signing.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not prepare the team sheet."); }
  }
  async function importPending() {
    try {
      const draft = await importPendingTactic(pendingJson);
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
      setPrepared(draft); setImportedPending(true); setMode("commit"); setStatus(`Tactique en attente vérifiée (hash valide) pour le club #${clubId}. Elle est prête à être simulée puis révélée.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Impossible d’importer la tactique en attente."); }
  }
  async function switchToPolygon() {
    try { setStatus("MetaMask: switching to Polygon…"); await ensurePolygonNetwork(); await refreshChain(); setStatus("MetaMask is ready on Polygon. You can simulate the tactic."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Polygon switch was refused by MetaMask."); }
  }
  async function run(live: boolean, reveal = false) {
    if (!wallet || !accountName || !window.ethereum) { setStatus("Connect the manager’s MetaMask wallet first."); return; }
    try {
      setStatus("Checking that MetaMask is on Polygon…");
      await ensurePolygonNetwork();
      await refreshChain();
      const shouldReveal = reveal || importedPending;
      let draft = prepared;
      if (reveal && !draft) { const saved = window.localStorage.getItem(draftKey); if (!saved) throw new Error("No hidden tactic has been stored in this browser."); draft = JSON.parse(saved); }
      if (!draft) throw new Error("Prepare the team sheet first.");
      const move = shouldReveal ? draft.revealMove : mode === "commit" ? draft.commitMove : draft.publicMove;
      const transaction = await composeXayaMove(accountName, move);
      if (!live) {
        const gas = await window.ethereum.request({ method: "eth_estimateGas", params: [{ from: wallet, to: XAYA_ACCOUNTS_ADDRESS, data: transaction.data }] });
        setStatus(`Simulation accepted by Polygon. Token #${transaction.tokenId}, nonce ${transaction.nonce}, estimated gas ${String(gas)}. No transaction was sent.`); return;
      }
      if (!confirmed) throw new Error("Confirm that you want to create a real Polygon transaction first.");
      if (mode === "commit" && !shouldReveal) window.localStorage.setItem(draftKey, JSON.stringify(draft));
      const hash = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: wallet, to: XAYA_ACCOUNTS_ADDRESS, data: transaction.data }] });
      setStatus(`Transaction submitted to MetaMask: ${String(hash)}. Wait for Polygon confirmation before reloading the game state.`); onMessage("Tactics move sent to MetaMask. The GSP may take a moment to index it.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "The preflight failed or the wallet rejected the request."); }
  }
  return <section className="tactic-workbench"><header><div><b>TACTIC BOARD / {selection.length}/18 SELECTED</b><span>Pick your XI, substitutes and match instructions. The generated move is validated before MetaMask opens.</span></div><span className="tactic-state">{mode === "commit" ? "HIDDEN" : "PUBLIC"}</span></header><div className={chainId === "0x89" ? "network-bar ready" : "network-bar"}><b>{chainId === "0x89" ? "● POLYGON CONNECTED" : `● WRONG NETWORK ${chainId ?? "…"}`}</b><span>{chainId === "0x89" ? "Xaya moves can be simulated and signed." : "Soccerverse moves are blocked outside Polygon."}</span><button onClick={() => void switchToPolygon()}>SWITCH TO POLYGON</button></div><div className="match-strip"><span>NEXT FIXTURE · ATK MOHUN BAGAN</span><b>{formationName(formation)} · {playStyleName(style)}</b><button className="submit-tactic" onClick={() => void prepare()}>PREPARE & VALIDATE</button></div><div className="tactic-editor"><aside className="tactic-sidebar"><h3>SETUP</h3><label>FORMATION<select value={formation} onChange={(event) => setFormation(Number(event.target.value))}>{[[0,"4-4-2"],[1,"4-3-3"],[3,"3-4-3"],[12,"4-2-3-1"],[14,"4-4-1-1"],[19,"4-2-4"],[20,"4-2-2-2"],[22,"4-1-3-2"]].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>PLAY STYLE<select value={style} onChange={(event) => setStyle(Number(event.target.value))}>{[[0,"Normal"],[1,"Defensive"],[2,"Offensive"],[3,"Passing"],[4,"Counter attack"],[5,"Long balls"]].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label><RoleSelect label="CAPTAIN" value={rolePlayer(captainId)} players={starters} lookup={players} onChange={setCaptainId}/><RoleSelect label="PENALTY TAKER" value={rolePlayer(penaltyId)} players={starters} lookup={players} onChange={setPenaltyId}/><RoleSelect label="CORNER TAKER" value={rolePlayer(cornerId)} players={starters} lookup={players} onChange={setCornerId}/><RoleSelect label="FREE KICKS" value={rolePlayer(freeKickId)} players={starters} lookup={players} onChange={setFreeKickId}/><div className="instruction-grid"><label>TEMPO<select value={tempo} onChange={(event) => setTempo(Number(event.target.value))}><option value={0}>Slow</option><option value={1}>Normal</option><option value={2}>Fast</option></select></label><label>TACKLING<select value={tackling} onChange={(event) => setTackling(Number(event.target.value))}><option value={0}>Easy</option><option value={1}>Normal</option><option value={2}>Hard</option></select></label></div><label>VISIBILITY<select value={mode} onChange={(event) => setMode(event.target.value as "public" | "commit")}><option value="public">Public team sheet</option><option value="commit">Hide tactics (commit)</option></select></label></aside><div className="pitch"><div className="pitch-title">STARTING XI <span>click a bench player to promote into XI</span></div>{formationCoordinates(formation).map(([left, top], index) => { const player = players.get(starters[index]); return <button className="pitch-player" style={{ left: `${left}%`, top: `${top}%` }} key={index} title={player?.display_name ?? "Choose player"}><b>{player?.rating ?? "—"}</b><span>{player?.position_main ?? "—"}</span><strong>{player?.display_name ?? "Empty slot"}</strong></button>; })}</div><aside className="bench"><h3>SUBSTITUTES <span>{substitutes.length}/7</span></h3>{substitutes.map((id) => { const player = players.get(id); return <button key={id} onClick={() => promote(id)}><b>{player?.rating}</b><span>{player?.position_main}</span><strong>{player?.display_name}</strong><i>MAKE XI</i></button>; })}{Array.from({ length: Math.max(0, 7 - substitutes.length) }, (_, index) => <div className="empty-sub" key={index}>EMPTY SUB</div>)}</aside></div><div className="player-picker"><header><b>CLUB SQUAD · SELECT 18</b><span>Click a player to add/remove. Bench players can be promoted from the right column.</span></header><div>{squad.map((player) => { const selected = selection.includes(player.player_id); const starter = starters.includes(player.player_id); return <button className={selected ? starter ? "chosen starter" : "chosen" : ""} key={player.player_id} onClick={() => choosePlayer(player.player_id)}><b>{player.rating}</b><span>{player.position_main}</span><strong>{player.display_name}</strong><i>{starter ? "XI" : selected ? "SUB" : "ADD"}</i></button>; })}</div></div><p className="tactic-status">{status}</p><details className="pending-import"><summary>IMPORT A PENDING TACTIC TO REVEAL</summary><textarea value={pendingJson} onChange={(event) => setPendingJson(event.target.value)} placeholder='Paste the complete object: { "hash", "prepared", "tacticsClubId" }'/><button onClick={() => void importPending()}>VERIFY & LOAD PENDING TACTIC</button></details>{prepared && <><details><summary>Inspect the exact Soccerverse move (JSON)</summary><code>{importedPending ? prepared.revealMove : mode === "commit" ? prepared.commitMove : prepared.publicMove}</code></details><div className="tactic-actions"><button onClick={() => void run(false)}>{importedPending ? "SIMULATE REVEAL" : "SIMULATE ON POLYGON"}</button><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/> I understand this creates a real on-chain move.</label><button className="live-action" disabled={!confirmed || chainId !== "0x89"} onClick={() => void run(true)}>{importedPending ? "REVEAL VIA METAMASK" : "SEND TO METAMASK"}</button>{mode === "commit" && !importedPending && <button onClick={() => void run(true, true)}>REVEAL SAVED TACTIC</button>}</div></>}</section>;
}
async function ensurePolygonNetwork() {
  if (!window.ethereum) throw new Error("MetaMask is not available.");
  const polygonChainId = "0x89";
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId === polygonChainId) return;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: polygonChainId }] });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: number }).code : undefined;
    if (code !== 4902) throw new Error("Passe MetaMask sur Polygon avant de signer la tactique.");
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: polygonChainId, chainName: "Polygon", nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 }, rpcUrls: ["https://polygon.drpc.org"], blockExplorerUrls: ["https://polygonscan.com"] }] });
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: polygonChainId }] });
  }
  const confirmedChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (confirmedChainId !== polygonChainId) throw new Error("MetaMask n’est pas sur Polygon : transaction bloquée.");
}
function RoleSelect({ label, value, players, lookup, onChange }: { label: string; value: number | undefined; players: number[]; lookup: Map<number, import("@/lib/soccerverse").Player>; onChange: (id: number) => void }) { return <label>{label}<select value={value ?? ""} onChange={(event) => onChange(Number(event.target.value))}>{players.map((id) => <option key={id} value={id}>{lookup.get(id)?.display_name ?? `Player #${id}`}</option>)}</select></label>; }
function formationName(id: number) { return ({ 0: "4-4-2", 1: "4-3-3", 3: "3-4-3", 12: "4-2-3-1", 14: "4-4-1-1", 19: "4-2-4", 20: "4-2-2-2", 22: "4-1-3-2" } as Record<number, string>)[id] ?? "Custom"; }
function playStyleName(id: number) { return ["Normal", "Defensive", "Offensive", "Passing", "Counter attack", "Long balls"][id] ?? "Normal"; }
function formationCoordinates(id: number): Array<[number, number]> { const lines = ({ 0: [1, 4, 4, 2], 1: [1, 4, 3, 3], 3: [1, 3, 4, 3], 12: [1, 4, 2, 3, 1], 14: [1, 4, 4, 1, 1], 19: [1, 4, 2, 4], 20: [1, 4, 2, 2, 2], 22: [1, 4, 1, 3, 2] } as Record<number, number[]>)[id] ?? [1, 4, 2, 3, 1]; const vertical = lines.length === 4 ? [88, 65, 38, 15] : [88, 70, 51, 32, 13]; return lines.flatMap((count, row) => Array.from({ length: count }, (_, index): [number, number] => [((index + 1) * 100) / (count + 1), vertical[row]])); }
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
