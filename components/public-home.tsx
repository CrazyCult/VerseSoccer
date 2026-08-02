"use client";

import type { ReactNode } from "react";

const routes = [
  ["01", "CONNECT A WALLET", "Find the Xaya accounts associated with your Polygon wallet."],
  ["02", "CHOOSE YOUR ROLE", "Manage a club, trade influence, represent players, or simply explore."],
  ["03", "BUILD YOUR DESK", "Your club home becomes a personalised board of widgets after connection."],
];

const tools = [
  ["PLAYER SCOUTING", "Ratings, age, wages, positions and the player’s full history."],
  ["CLUB MARKET", "Club influence, trading information, balance, stadium and league context."],
  ["TRANSFER INTELLIGENCE", "Transfers and loans can be filtered by club, player and season."],
  ["ON-CHAIN COMMANDS", "Club tactics are prepared locally then signed in your wallet on Polygon."],
];

export function PublicHome({ onConnect, message }: { onConnect: () => void; message: string }) {
  return <section className="public-home">
    <div className="public-hero">
      <div className="hero-copy"><p className="eyebrow">PUBLIC HOME / NO LIVE CLUB REQUESTS</p><h1>THE FOOTBALL<br/><span>OWNERSHIP DESK</span></h1><p>VerseSoccer is your compact control room for Soccerverse: explore the world, then connect a wallet when it is time to manage.</p><div className="hero-actions"><button className="wallet-button" onClick={onConnect}>CONNECT WALLET</button><a className="outline-button" href="https://play.soccerverse.com" target="_blank">OPEN SOCCERVERSE ↗</a></div><small>{message}</small></div>
      <div className="hero-board" aria-hidden="true"><b>SOCCER<br/>VERSE</b><i/><i/><i/><i/><i/><i/><div>YOUR CLUB.<br/><span>YOUR CALL.</span></div></div>
    </div>
    <div className="public-grid">
      <article className="public-panel public-about"><Panel title="WHAT IS ON THE DESK"/><p>A football strategy game where clubs and players are on-chain assets. The public desk stays light: no automatic market or club polling before you choose to connect.</p><div className="role-list"><span>MANAGER <b>TACTICS & SQUAD</b></span><span>INFLUENCER <b>CLUB & PLAYER MARKETS</b></span><span>AGENT <b>CAREER & CONTRACTS</b></span></div></article>
      <article className="public-panel public-api"><Panel title="DATA YOU CAN EXPLORE"/><p>The official API exposes player and club markets, detailed player profiles, histories, league tables, transfers and loans. We will only request each source when its widget is opened.</p><a href="https://services.soccerverse.com/api/docs" target="_blank">VIEW API REFERENCE ↗</a></article>
      <article className="public-panel public-world"><Panel title="THE GAME WORLD"/><div className="world-map"><span>AMERICAS</span><span>EUROPE</span><span>AFRICA</span><span>ASIA</span></div><p>Start with a club, a player, a league or a country. The future World view will turn the game’s global structure into an efficient exploration tool.</p></article>
      <article className="public-panel public-route"><Panel title="FROM WALLET TO DUGOUT"/>{routes.map(([number, title, copy]) => <div className="route" key={number}><b>{number}</b><span><strong>{title}</strong>{copy}</span></div>)}</article>
      <article className="public-panel public-tools"><Panel title="PLANNED WORKSPACES"/>{tools.map(([title, copy]) => <div className="tool" key={title}><b>{title}</b><span>{copy}</span></div>)}</article>
      <article className="public-panel public-cta"><Panel title="READY TO PLAY?"/><p>Connect MetaMask or WalletConnect. VerseSoccer reads public account data first; it never signs an on-chain action without your confirmation.</p><button className="wallet-button" onClick={onConnect}>ENTER YOUR COMMAND CENTRE</button></article>
    </div>
  </section>;
}

function Panel({ title, children }: { title: string; children?: ReactNode }) { return <header className="public-panel-title"><h2>{title}</h2>{children}</header>; }
