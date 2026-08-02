"use client";

import { useState } from "react";
import type { Club, LeagueRow, Player } from "@/lib/soccerverse";
import { formatSVC } from "@/lib/soccerverse";

export type WidgetSource = "club" | "squad" | "league" | "marketPlayers" | "marketClubs";
export type CustomWidget = { id: string; title: string; source: WidgetSource; view: "metric" | "table" | "chart"; field: string; columns: string; width: number; height: number };

const fields: Record<WidgetSource, string[]> = {
  club: ["balance", "last_price", "total_wages", "total_player_value", "fans_current", "league_position"],
  squad: ["rating", "fitness", "wages", "value", "age"],
  league: ["pts", "played", "won", "drawn", "lost"],
  marketPlayers: ["rating", "value", "last_price", "volume_7_day", "wages", "age"],
  marketClubs: ["last_price", "volume_7_day", "balance", "fans_current", "league_position"],
};

export function WidgetStudio({ onCreate }: { onCreate: (widget: CustomWidget) => void }) {
  const [source, setSource] = useState<WidgetSource>("squad");
  const [view, setView] = useState<CustomWidget["view"]>("table");
  const [field, setField] = useState("rating");
  const [title, setTitle] = useState("My squad board");
  const [columns, setColumns] = useState("display_name,rating,fitness,value");
  const create = () => onCreate({ id: crypto.randomUUID(), title: title.trim() || "Untitled widget", source, view, field, columns, width: view === "table" ? 2 : 1, height: view === "chart" ? 2 : 1 });
  return <article className="panel widget-studio"><PanelTitle title="WIDGET STUDIO" detail="API-BASED, ON DEMAND"/><p>Create a personal widget from documented Soccerverse data. Market sources are requested only when the resulting widget is shown.</p><div className="studio-form"><label>TITLE<input value={title} onChange={(event) => setTitle(event.target.value)}/></label><label>DATA SOURCE<select value={source} onChange={(event) => { const next = event.target.value as WidgetSource; setSource(next); setField(fields[next][0]); }}><option value="club">Current club (already loaded)</option><option value="squad">Current squad (already loaded)</option><option value="league">Current league table (already loaded)</option><option value="marketPlayers">Player market (API on demand)</option><option value="marketClubs">Club market (API on demand)</option></select></label><label>DISPLAY<select value={view} onChange={(event) => setView(event.target.value as CustomWidget["view"])}><option value="metric">Metric</option><option value="table">Table</option><option value="chart">Bar chart</option></select></label><label>MAIN FIELD<select value={field} onChange={(event) => setField(event.target.value)}>{fields[source].map((item) => <option key={item}>{item}</option>)}</select></label>{view === "table" && <label className="studio-columns">TABLE COLUMNS<input value={columns} onChange={(event) => setColumns(event.target.value)} placeholder="display_name,rating,value"/></label>}</div><div className="studio-foot"><a href="https://services.soccerverse.com/api/docs" target="_blank">OFFICIAL API DOCS ↗</a><button className="action" onClick={create}>ADD TO MY DESK</button></div></article>;
}

export function GeneratedWidget({ widget, club, squad, league, market, onRemove, onResize }: { widget: CustomWidget; club?: Club; squad: Player[]; league: LeagueRow[]; market: Record<string, Record<string, unknown>[]>; onRemove: () => void; onResize: (axis: "width" | "height", delta: number) => void }) {
  const rows = getRows(widget.source, club, squad, league, market);
  const labels = rows.slice(0, 7).map((row, index) => ({ label: String(row.display_name ?? row.name ?? row.club_name ?? row.player_id ?? row.club_id ?? `Row ${index + 1}`), value: numeric(row[widget.field]) }));
  const max = Math.max(1, ...labels.map((item) => item.value));
  return <article className="panel generated-widget" style={{ gridColumn: `span ${widget.width}`, gridRow: `span ${widget.height}` }}><PanelTitle title={widget.title.toUpperCase()} detail={`${widget.view.toUpperCase()} · ${widget.source}`}/><WidgetControls onRemove={onRemove} onResize={onResize}/>{widget.view === "metric" ? <div className="generated-metric"><b>{formatValue(labels[0]?.value ?? 0, widget.field)}</b><span>{widget.field.replace(/_/g, " ")}</span><small>{labels[0]?.label ?? "No data"}</small></div> : widget.view === "chart" ? <div className="generated-chart">{labels.map((item) => <div key={item.label}><span title={item.label}>{item.label}</span><i style={{ width: `${item.value / max * 100}%` }}/><b>{formatValue(item.value, widget.field)}</b></div>)}</div> : <div className="generated-table"><header>{widget.columns.split(",").map((column) => <span key={column}>{column.trim().replace(/_/g, " ")}</span>)}</header>{rows.slice(0, 8).map((row, index) => <div key={`${widget.id}-${index}`}>{widget.columns.split(",").map((column) => <span key={column}>{renderCell(row[column.trim()])}</span>)}</div>)}</div>}{!rows.length && <p className="empty-copy">No records available for this source yet.</p>}</article>;
}

function WidgetControls({ onRemove, onResize }: { onRemove: () => void; onResize: (axis: "width" | "height", delta: number) => void }) { return <div className="widget-controls"><button onClick={() => onResize("width", -1)}>W−</button><button onClick={() => onResize("width", 1)}>W+</button><button onClick={() => onResize("height", -1)}>H−</button><button onClick={() => onResize("height", 1)}>H+</button><button className="remove" onClick={onRemove}>×</button></div>; }
function getRows(source: WidgetSource, club: Club | undefined, squad: Player[], league: LeagueRow[], market: Record<string, Record<string, unknown>[]>) { if (source === "club") return club ? [club as unknown as Record<string, unknown>] : []; if (source === "squad") return squad as unknown as Record<string, unknown>[]; if (source === "league") return league as unknown as Record<string, unknown>[]; return market[source] ?? []; }
function numeric(value: unknown) { return typeof value === "number" ? value : Number(value) || 0; }
function formatValue(value: number, field: string) { return field.includes("price") || field.includes("value") || field.includes("wage") || field === "balance" ? formatSVC(value) : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function renderCell(value: unknown) { return typeof value === "number" ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value) : String(value ?? "—"); }
function PanelTitle({ title, detail }: { title: string; detail: string }) { return <header className="panel-title"><h2>{title}</h2><span>{detail}</span></header>; }
