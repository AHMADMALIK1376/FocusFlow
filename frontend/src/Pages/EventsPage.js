import React, { useMemo, useState } from "react";
import Calendar from "react-calendar";
import { CalendarDays, CalendarClock, CalendarCheck, CalendarRange, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button, Input, EmptyState } from "../components/ui";
import { PageShell, PageHeader, StatTile, Panel } from "../components/dashboard/DashKit";
import ChartBox from "../components/charts/ChartBox";
import { chartColors, hexToRgba, CHART_TOOLTIP } from "../components/charts/chartColors";
import { usePreferences } from "../preferences/usePreferences";
import { useEvents } from "../features/eventsx/useEvents";
import { eventsOn, upcoming } from "../features/eventsx/eventsLogic";

const TODAY = new Date().toISOString().slice(0, 10);
const toYMD = (date) => date.toISOString().slice(0, 10);

export default function EventsPage() {
  const { state, dispatch } = useEvents();
  const { activeDashboard } = usePreferences();
  const { brand } = chartColors(activeDashboard?.palette);

  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [calDate, setCalDate] = useState(new Date());
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");

  const dayEvents = eventsOn(state, selectedDay);
  const nextUp = upcoming(state, TODAY, 6);
  const thisMonth = state.events.filter((e) => (e.date || "").slice(0, 7) === TODAY.slice(0, 7)).length;
  const upcomingCount = state.events.filter((e) => e.date >= TODAY).length;

  const next7 = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" }), count: eventsOn(state, key).length });
    }
    return days;
  }, [state]);

  function addEvent() {
    if (!newTitle.trim()) return;
    dispatch({ type: "ADD", payload: { date: selectedDay, title: newTitle.trim(), time: newTime, color: "brand" } });
    setNewTitle(""); setNewTime("");
  }

  function tileContent({ date, view }) {
    if (view !== "month") return null;
    if (eventsOn(state, toYMD(date)).length === 0) return null;
    return <div className="flex justify-center mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-brand" /></div>;
  }

  return (
    <PageShell>
      <PageHeader title="Events" subtitle="Plan your calendar and never miss what matters." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile primary icon={<CalendarDays size={18} />} label="Total events" value={state.events.length} sub="All scheduled" />
        <StatTile icon={<CalendarCheck size={18} />} label="Today" value={dayEvents.length && selectedDay === TODAY ? dayEvents.length : eventsOn(state, TODAY).length} sub="On the agenda" />
        <StatTile icon={<CalendarClock size={18} />} label="Upcoming" value={upcomingCount} sub="From today on" />
        <StatTile icon={<CalendarRange size={18} />} label="This month" value={thisMonth} sub="Scheduled" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Panel title="Calendar" subtitle="Dots mark days with events">
          <Calendar value={calDate} onChange={(date) => { setCalDate(date); setSelectedDay(toYMD(date)); }} tileContent={tileContent} className="w-full" />
        </Panel>

        <Panel title="Next 7 days" subtitle="How busy your week looks" className="lg:col-span-2">
          <ChartBox height={230}>
            {(cw) => (
              <BarChart width={cw} height={230} data={next7} margin={{ top: 14, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="ffEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brand} stopOpacity={1} />
                    <stop offset="100%" stopColor={brand} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" stroke={hexToRgba(brand, 0.1)} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} dy={4} tick={{ fontSize: 11, fontWeight: 700, fill: "#8A93A0" }} />
                <YAxis axisLine={false} tickLine={false} width={28} allowDecimals={false} tick={{ fontSize: 11, fill: "#8A93A0" }} />
                <Tooltip cursor={{ fill: hexToRgba(brand, 0.05) }} contentStyle={CHART_TOOLTIP} formatter={(v) => [`${v} event${v === 1 ? "" : "s"}`, ""]} />
                <Bar dataKey="count" name="Events" radius={[6, 6, 0, 0]} fill="url(#ffEvents)" maxBarSize={36} />
              </BarChart>
            )}
          </ChartBox>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title={`Add to ${selectedDay}`}>
          <div className="space-y-2.5">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Event title…" onKeyDown={(e) => e.key === "Enter" && addEvent()} />
            <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <Button variant="primary" onClick={addEvent} className="w-full gap-1.5"><Plus size={16} /> Add event</Button>
          </div>

          <h4 className="text-xs font-black uppercase tracking-wider text-muted mt-5 mb-2">On {selectedDay}</h4>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted py-3 text-center">No events this day.</p>
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2.5">
                  <div className="w-1.5 h-8 rounded-full bg-grad-hero shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{ev.title}</p>
                    {ev.time && <p className="text-xs text-muted">{ev.time}</p>}
                  </div>
                  <button onClick={() => dispatch({ type: "REMOVE", payload: { id: ev.id } })} className="text-muted hover:text-focus text-xs shrink-0">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming">
          {nextUp.length === 0 ? (
            <EmptyState icon="📅" title="No upcoming events" description="Add one from the calendar" />
          ) : (
            <ul className="space-y-2">
              {nextUp.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 bg-surface-2 rounded-token-md px-3 py-2.5">
                  <div className="w-1.5 h-8 rounded-full bg-info shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{ev.title}</p>
                    <p className="text-xs text-muted">{ev.date}{ev.time ? ` — ${ev.time}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
