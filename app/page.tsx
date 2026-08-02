import { formatNumber, formatSVC, getClubSnapshot } from "@/lib/soccerverse";

export const revalidate = 60;

export default async function Home() {
  const live = await getClubSnapshot().catch(() => null);
  const club = live?.club;
  const squad = live?.squad ?? [];
  const averageFitness = live?.averageFitness ?? 0;

  const metrics = live && club ? [
    ["CLUB BALANCE", "SVC " + formatSVC(club.balance), ""],
    ["AVG. RATING", String(club.avg_player_rating_top21 ?? "—"), "blue"],
    ["TEAM FITNESS", averageFitness + "%", "green"],
    ["FANS", formatNumber(club.fans_current), "green"],
    ["LEAGUE POSITION", club.league_position ? "#" + club.league_position : "—", "gold"],
  ] : [
    ["CLUB BALANCE", "UNAVAILABLE", ""],
    ["AVG. RATING", "—", "blue"],
    ["TEAM FITNESS", "—", "green"],
    ["FANS", "—", "green"],
    ["LEAGUE POSITION", "—", "gold"],
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">SOCCER<span>VERSE</span></a>
        <nav>{["HOME", "WORLD", "TRANSFERS", "INFLUENCE", "VOTES", "DATABASE"].map((item, index) => <a className={index === 0 ? "active" : ""} href="#" key={item}>{item}</a>)}</nav>
        <span className="wallet">PUBLIC DATA</span>
      </header>

      <section className="intro">
        <div><p className="eyebrow">{club ? club.country_id + " / CLUB " + club.club_id : "SOCCERVERSE / PUBLIC API"}</p><h1>{club?.manager_name ?? "CLUB DATA UNAVAILABLE"}</h1></div>
        <span className={live ? "status" : "status offline"}>{live ? "● LIVE API · REFRESH 60S" : "● API TEMPORARILY UNAVAILABLE"}</span>
      </section>

      <section className="metrics">
        {metrics.map(([label, value, tone]) => <div key={label}><small>{label}</small><strong className={tone}>{value}</strong></div>)}
      </section>

      <section className="dashboard">
        <article className="panel">
          <PanelTitle title="CLUB PROFILE" detail={club ? club.country_id + " / DIVISION " + (club.league_position ?? "—") : "LIVE STATUS"} />
          <div className="fixture">
            <strong>{club?.manager_name ?? "WAITING FOR API"}</strong>
            <div className="teams"><span><i className="crest">SV</i>{club ? "CLUB " + club.club_id : "SOCCERVERSE"}</span><b>●</b><span><i className="crest away">FC</i>{club ? formatNumber(club.stadium_size_current) + " SEATS" : "PUBLIC DATA"}</span></div>
            <small>{club ? "CURRENT FORM: " + (club.form || "—") : "The public endpoint did not return data."}</small>
          </div>
          <a className="action link-action" href="https://legacy.soccerverse.com/club/15516" target="_blank">OPEN OFFICIAL CLUB PAGE →</a>
        </article>

        <article className="panel tactic">
          <PanelTitle title="LIVE SQUAD OVERVIEW" detail={squad.length + " PLAYERS RETURNED"} />
          <div className="pitch">
            {squad.slice(0, 11).map((player, index) => {
              const positions = [["49%", "8%"], ["18%", "28%"], ["80%", "28%"], ["33%", "47%"], ["66%", "47%"], ["13%", "67%"], ["38%", "67%"], ["62%", "67%"], ["87%", "67%"], ["49%", "84%"], ["49%", "94%"]];
              const [left, top] = positions[index];
              return <i className="dot" style={{ left, top }} key={player.player_id} title={player.position_main + " · " + player.rating} />;
            })}
          </div>
          <footer className="caption"><b>AVERAGE FITNESS {averageFitness}%</b><span>FORMATION IS VISUAL ONLY</span></footer>
        </article>

        <article className="panel">
          <PanelTitle title="LIVE SQUAD" detail={squad.length + " PLAYERS"} />
          <div>
            {squad.slice(0, 3).map((player, index) => (
              <div className={index === 0 ? "row cyan" : index === 1 ? "row gold" : "row green"} key={player.player_id}>
                <i /><div><b>PLAYER #{player.player_id} · {player.position_main}</b><small>{player.country_id} · fitness {player.fitness}%</small></div><strong>{player.rating}</strong>
              </div>
            ))}
          </div>
          <div className="node-note"><b>LIVE READ-ONLY DATA</b><br />Club and player data is now served from the public Soccerverse API.</div>
        </article>
      </section>
    </main>
  );
}

function PanelTitle({ title, detail }: { title: string; detail: string }) {
  return <header className="panel-title"><h2>{title}</h2><span>{detail}</span></header>;
}
