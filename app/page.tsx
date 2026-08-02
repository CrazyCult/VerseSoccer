const alerts = [
  ["Confirm starting XI", "Required before kick-off", "03H", "cyan"],
  ["Offer for A. Kane", "SVC 2.18M · transfer market", "18H", "gold"],
  ["Club staff vote", "Influence decision", "OPEN", "green"],
] as const;

const tacticalPlayers = [
  { left: "49%", top: "8%", enemy: false },
  { left: "19%", top: "30%", enemy: false },
  { left: "46%", top: "48%", enemy: false },
  { left: "70%", top: "64%", enemy: false },
  { left: "46%", top: "78%", enemy: false },
  { left: "80%", top: "25%", enemy: true },
  { left: "80%", top: "67%", enemy: true },
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">SOCCER<span>VERSE</span></a>
        <nav>
          {["HOME", "WORLD", "TRANSFERS", "INFLUENCE", "VOTES", "DATABASE"].map((item, index) => (
            <a className={index === 0 ? "active" : ""} href="#" key={item}>{item}</a>
          ))}
        </nav>
        <span className="wallet">SVC 6.02K</span>
      </header>

      <section className="intro">
        <div><p className="eyebrow">KOLKATA GREEN / COMMUNITY NODE ONLINE</p><h1>COMMAND CENTRE</h1></div>
        <span className="status">DEMO DATA · LIVE INTEGRATION NEXT</span>
      </section>

      <section className="metrics">
        {[["CLUB BALANCE", "SVC 4.82M", ""], ["INFLUENCE", "1.45M", "blue"], ["TEAM CONDITION", "88%", "green"], ["MARKET CHANGE", "+SVC 218K", "green"], ["NEXT KICK-OFF", "03H18", "gold"]].map(([label, value, tone]) => (
          <div key={label}><small>{label}</small><strong className={tone}>{value}</strong></div>
        ))}
      </section>

      <section className="dashboard">
        <article className="panel">
          <PanelTitle title="NEXT FIXTURE" detail="IND CUP / R1" />
          <div className="fixture">
            <strong>TODAY · 15:30</strong>
            <div className="teams"><span><i className="crest">KG</i>KOLKATA</span><b>VS</b><span><i className="crest away">VA</i>VARANASI</span></div>
            <small>VARANASI STADIUM · AWAY</small>
          </div>
          <button className="action">OPEN MATCH CENTRE →</button>
        </article>

        <article className="panel tactic">
          <PanelTitle title="TACTICAL BOARD" detail="4–3–3 HIGH PRESS" />
          <div className="pitch">
            {tacticalPlayers.map((player, index) => (
              <i className={player.enemy ? "dot enemy" : "dot"} style={{ left: player.left, top: player.top }} key={index} />
            ))}
          </div>
          <footer className="caption"><b>FITNESS 88% · FAMILIARITY HIGH</b><span>EDIT TACTICS</span></footer>
        </article>

        <article className="panel">
          <PanelTitle title="ATTENTION" detail="03 OPEN" />
          <div>
            {alerts.map(([title, detail, due, tone]) => (
              <div className={"row " + tone} key={title}><i /><div><b>{title}</b><small>{detail}</small></div><strong>{due}</strong></div>
            ))}
          </div>
          <div className="node-note"><b>CONNECTED FOOTBALL WORLD</b><br />Stadium, football operations and global-node data in one home screen.</div>
        </article>
      </section>
    </main>
  );
}

function PanelTitle({ title, detail }: { title: string; detail: string }) {
  return <header className="panel-title"><h2>{title}</h2><span>{detail}</span></header>;
}
