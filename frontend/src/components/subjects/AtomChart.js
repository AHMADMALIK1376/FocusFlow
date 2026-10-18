import React, { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { subjectPalette } from "./SubjectTable";
import {
  CENTRE, arcDash, electronPoint, isAtRisk, nucleusScale, overallValue,
  SCENE_ASPECT, ringRadii, ringStroke, ringTilts, subjectValue, viewFor,
} from "./atomGeometry";

// The semester as an atom: the overall percentage is the nucleus, every subject an orbit ring in its own
// colour, filled to that subject's percentage with an "electron" at the end of the filled part.
// The rings are real CSS 3D (perspective, tilted planes), no WebGL. Fully controlled: the page owns
// the view, the metric and the selected subject.

const MODES = [{ id: "one", label: "One" }, { id: "all", label: "All" }, { id: "overall", label: "Overall" }];
const METRICS = [{ id: "attendance", label: "Attendance" }, { id: "grade", label: "Grade" }];
const cell = (v) => (v.main ? `${v.main}, ${v.detail}` : "No data yet");
const OVERALL_LABEL = { attendance: "Overall attendance", grade: "Overall grade" };

// A pill switch: real radio buttons, arrow keys move and select, only the checked one is a tab stop.
function Pills({ label, options, value, onChange }) {
  const refs = useRef([]);
  const move = (e, i) => {
    const key = e.key;
    const step = key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-surface-2 shadow-neu-inset p-1 gap-1">
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => move(e, i)}
            className={`min-h-[40px] px-4 rounded-full text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${on ? "bg-brand text-on-brand shadow-neu-sm" : "text-muted hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Ring({ subject, index, radius, tilt, stroke, mode, selected, metric, calm, onSelect }) {
  const pal = subjectPalette(subject.color);
  const { pct } = subjectValue(subject, metric);
  const dash = arcDash(pct);
  const bead = electronPoint(pct, radius);
  const view = viewFor(mode, selected, radius);
  const live = mode === "all" || (mode === "one" && selected);
  const w = selected && mode !== "overall" ? stroke * 1.5 : stroke;
  const glow = selected && mode !== "overall" ? { filter: `drop-shadow(0 0 2px ${pal.mid})` } : undefined;
  return (
    <motion.div
      className="absolute inset-0"
      style={{ transformStyle: "preserve-3d", rotateZ: tilt.rz, rotateX: tilt.rx, originX: "50%", originY: "50%", pointerEvents: "none" }}
      initial={false}
      animate={view}
      transition={calm ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 18 }}
      data-testid="atom-ring"
      data-ring={index}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" style={glow} aria-hidden="true" focusable="false">
        <circle
          cx={CENTRE} cy={CENTRE} r={radius} fill="none" stroke={pal.mid} strokeWidth={dash ? w * 0.6 : w}
          strokeOpacity={dash ? 0.16 : 0.55} strokeDasharray={dash ? undefined : `${w} ${w * 1.6}`}
        />
        {dash && (
          <circle
            cx={CENTRE} cy={CENTRE} r={radius} fill="none" stroke={pal.mid} strokeWidth={w} strokeLinecap="round"
            pathLength="100" strokeDasharray={`${dash.dash} ${dash.gap}`} transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
          />
        )}
        {bead && <circle cx={bead.x} cy={bead.y} r={Math.max(1.7, w * 1.1)} fill={pal.mid} stroke="rgb(var(--surface))" strokeWidth={Math.max(0.6, w * 0.3)} />}
        {live && (
          <circle
            cx={CENTRE} cy={CENTRE} r={radius} fill="none" stroke="transparent" strokeWidth={Math.max(6, w + 3)}
            style={{ pointerEvents: "stroke", cursor: "pointer" }} onClick={() => onSelect && onSelect(subject.id)}
          />
        )}
      </svg>
    </motion.div>
  );
}

function Readout({ title, kicker, value, atRisk }) {
  return (
    <div className="text-center min-w-0">
      {kicker && <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{kicker}</p>}
      <p className="font-black text-ink text-lg leading-tight truncate">{title}</p>
      {value.main ? (
        <>
          <p className={`font-black text-4xl leading-none mt-1 ${atRisk ? "text-warn-ink" : "text-ink"}`}>{value.main}</p>
          <p className="text-sm text-muted mt-1">{value.detail}</p>
          {atRisk && <p className="text-xs font-bold text-warn-ink mt-0.5">Below the attendance minimum</p>}
        </>
      ) : (
        <p className="text-base font-bold text-muted mt-1">No data yet</p>
      )}
    </div>
  );
}

export default function AtomChart({ stats, mode, metric, selectedId, onSelect, onModeChange, onMetricChange }) {
  const calm = useReducedMotion();
  const subjects = (stats && stats.subjects) || [];
  const overall = overallValue(stats && stats.overall, metric);
  const picked = subjects.find((s) => s.id === selectedId) || subjects[0] || null;
  const radii = ringRadii(subjects.length);
  const tilts = ringTilts(subjects.length);
  const stroke = ringStroke(subjects.length);
  const attendance = metric === "attendance";
  const chosen = picked ? subjectValue(picked, metric) : null;

  return (
    <section aria-label="Atom chart" className="bg-surface rounded-token-lg shadow-neu p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Pills label="View" options={MODES} value={mode} onChange={onModeChange} />
        <Pills label="Measure" options={METRICS} value={metric} onChange={onMetricChange} />
      </div>

      <div className="w-full max-w-[34rem] mx-auto relative" style={{ aspectRatio: SCENE_ASPECT, containerType: "inline-size" }}>
        <div data-testid="atom-scene" className="absolute inset-x-0 aspect-square" style={{ top: "50%", marginTop: "-50cqw", perspective: "4000px", perspectiveOrigin: "50% 50%" }}>
          <motion.div
            data-testid="atom-stage"
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", originX: "50%", originY: "50%" }}
            animate={calm ? undefined : { rotateX: [-3, 3, -3], rotateY: [-8, 8, -8] }}
            transition={calm ? undefined : { duration: 22, repeat: Infinity, ease: "easeInOut" }}
          >
            {subjects.map((s, i) => (
              <Ring
                key={s.id} subject={s} index={i} radius={radii[i]} tilt={tilts[i]} stroke={stroke}
                mode={mode} selected={!!picked && s.id === picked.id} metric={metric} calm={calm} onSelect={onSelect}
              />
            ))}
          </motion.div>

          <div data-testid="atom-nucleus-wrap" className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="w-[24%] aspect-square rounded-full shadow-neu flex flex-col items-center justify-center text-center"
              style={{ background: "radial-gradient(circle at 32% 28%, rgb(var(--surface)) 0%, rgb(var(--brand-soft) / 0.55) 100%)" }}
              initial={false}
              animate={{ scale: nucleusScale(mode) }}
              transition={calm ? { duration: 0 } : { type: "spring", stiffness: 110, damping: 16 }}
            >
              {overall.main ? (
                <>
                  <span className={`font-black leading-none ${attendance && isAtRisk(overall.pct) ? "text-warn-ink" : "text-ink"}`} style={{ fontSize: "6.5cqw" }}>{overall.main}</span>
                  {mode !== "one" && <span className="text-muted font-bold leading-tight px-1" style={{ fontSize: "2cqw" }}>{OVERALL_LABEL[metric]}</span>}
                </>
              ) : (
                <span className="text-muted font-bold leading-tight px-1" style={{ fontSize: "2.4cqw" }}>No data yet</span>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <div aria-live="polite" data-testid="atom-readout" className="mt-3 min-h-[6.5rem] flex items-center justify-center">
        {mode === "overall" || !picked ? (
          <Readout title={OVERALL_LABEL[metric]} value={overall} atRisk={attendance && isAtRisk(overall.pct)} />
        ) : (
          <Readout
            title={picked.name} kicker={picked.code ? `${picked.code}${picked.isLab ? " · Lab" : ""}` : picked.isLab ? "Lab" : ""}
            value={chosen} atRisk={attendance && isAtRisk(chosen.pct)}
          />
        )}
      </div>

      {subjects.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Subjects">
          {subjects.map((s) => {
            const v = subjectValue(s, metric);
            const pal = subjectPalette(s.color);
            const on = !!picked && s.id === picked.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  title={s.name}
                  onClick={() => onSelect && onSelect(s.id)}
                  className={`min-h-[40px] inline-flex items-center gap-2 px-3 rounded-full text-xs font-bold bg-surface-2 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${on ? "shadow-neu-inset" : "shadow-neu-sm"}`}
                >
                  <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pal.mid }} />
                  <span className="truncate max-w-[7rem]">{s.code || s.name}</span>
                  <span className={attendance && isAtRisk(v.pct) ? "text-warn-ink" : "text-muted"}>{v.main || "No data"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <table className="sr-only">
        <caption>Attendance and grade for every subject</caption>
        <thead>
          <tr><th scope="col">Subject</th><th scope="col">Attendance</th><th scope="col">Grade</th></tr>
        </thead>
        <tbody>
          {subjects.map((s) => {
            const a = subjectValue(s, "attendance");
            const g = subjectValue(s, "grade");
            return (
              <tr key={s.id}>
                <th scope="row">{s.code ? `${s.name} (${s.code})` : s.name}</th>
                <td>{a.main ? `${a.main}, ${a.detail}${isAtRisk(a.pct) ? ", below the minimum" : ""}` : "No data yet"}</td>
                <td>{g.main ? `${g.main}, ${g.detail}` : "No data yet"}</td>
              </tr>
            );
          })}
          <tr>
            <th scope="row">All subjects</th>
            <td>{cell(overallValue(stats && stats.overall, "attendance"))}</td>
            <td>{cell(overallValue(stats && stats.overall, "grade"))}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
