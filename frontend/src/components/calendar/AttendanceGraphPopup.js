import React, { useState, useEffect } from "react";

// ========== Horizontal Bar Chart with Left Axis ==========
const HorizontalBarChart = ({ subjects }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Returns hex-compatible colors derived from semantic values
  // SVG requires hex/rgb strings not Tailwind classes
  const getColor = (pct) => {
    if (pct >= 80) return { main: 'rgb(var(--success))', light: 'rgb(var(--success)/0.15)' };
    if (pct >= 60) return { main: 'rgb(var(--warn))', light: 'rgb(var(--warn)/0.15)' };
    return { main: 'rgb(var(--focus))', light: 'rgb(var(--focus)/0.15)' };
  };

  const sortedSubjects = [...subjects].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  const barH = 30;
  const chartW = 560;
  const gap = 5;
  const paddingLeft = 35;
  const paddingRight = 60;
  const totalW = paddingLeft + chartW + paddingRight;
  const totalH = sortedSubjects.length * (barH + gap) + 55;

  return (
    <div className="flex justify-center w-full" style={{ overflow: 'visible', position: 'relative' }}>
      <svg width="100%" height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible' }}>

        <line x1={paddingLeft + (chartW * 0.6)} y1={5} x2={paddingLeft + (chartW * 0.6)} y2={sortedSubjects.length * (barH + gap) + 10}
          stroke="rgb(var(--focus))" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.5" />
        <text x={paddingLeft + (chartW * 0.6)} y={4} textAnchor="middle" fill="rgb(var(--focus))" fontSize="9" fontWeight="black">60% ⚠️</text>

        <line x1={paddingLeft} y1={sortedSubjects.length * (barH + gap) + 15}
          x2={paddingLeft + chartW} y2={sortedSubjects.length * (barH + gap) + 15}
          stroke="rgb(var(--ink)/0.15)" strokeWidth="1" />

        {[0, 25, 50, 75, 100].map((pct) => (
          <text key={pct} x={paddingLeft + chartW * (pct / 100)} y={sortedSubjects.length * (barH + gap) + 30}
            textAnchor="middle" fill="rgb(var(--muted))" fontSize="8">{pct}%</text>
        ))}

        {[0, 0.25, 0.5, 0.75, 1].map((pos) => (
          <line key={pos} x1={paddingLeft + chartW * pos} y1={sortedSubjects.length * (barH + gap) + 13}
            x2={paddingLeft + chartW * pos} y2={sortedSubjects.length * (barH + gap) + 17}
            stroke="rgb(var(--ink)/0.15)" strokeWidth="0.8" />
        ))}

        <line x1={paddingLeft} y1={8} x2={paddingLeft} y2={sortedSubjects.length * (barH + gap) + 10}
          stroke="rgb(var(--ink)/0.15)" strokeWidth="1" />

        <text x={paddingLeft + chartW / 2} y={sortedSubjects.length * (barH + gap) + 45}
          textAnchor="middle" fill="rgb(var(--muted))" fontSize="9" fontWeight="bold">
          Attendance Percentage →
        </text>

        {sortedSubjects.map((subject, i) => {
          const pct = subject.percentage || 0;
          const colors = getColor(pct);
          const isHovered = hoveredIndex === i;
          const barW = Math.max((pct / 100) * chartW, 4);
          const y = 10 + i * (barH + gap);

          return (
            <g key={subject.entryId || i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}>

              <text x={paddingLeft - 8} y={y + barH / 2 + 4} textAnchor="end"
                fill="rgb(var(--muted))" fontSize="9" fontWeight="bold">
                {sortedSubjects.length - i}
              </text>

              <rect x={paddingLeft} y={y} width={chartW} height={barH} rx="6" fill="rgb(var(--ink)/0.06)" />
              <rect x={paddingLeft} y={y} width={barW} height={barH} rx="6"
                fill={colors.main} opacity={isHovered ? 1 : 0.9} />

              {isHovered && (
                <rect x={paddingLeft} y={y} width={barW} height={barH} rx="6"
                  fill="none" stroke={colors.main} strokeWidth="2" opacity="0.6" />
              )}

              <text x={paddingLeft + 12} y={y + barH / 2 + 4} textAnchor="start"
                fill="rgb(var(--on-brand))" fontSize="11" fontWeight="black" opacity="0.95">
                {subject.subjectName?.substring(0, 26)}
              </text>

              <text x={paddingLeft + barW + 8} y={y + barH / 2 + 4}
                fill={colors.main} fontSize="11" fontWeight="black">
                {pct.toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIndex !== null && sortedSubjects[hoveredIndex] && (() => {
        const subject = sortedSubjects[hoveredIndex];
        const pct = subject.percentage || 0;
        const colors = getColor(pct);
        const barW = Math.max((pct / 100) * chartW, 4);
        const y = 10 + hoveredIndex * (barH + gap);
        const taken = (subject.attendedSessions || 0) + (subject.absentSessions || 0);

        return (
          <div
            className="absolute z-50 pointer-events-none"
            style={{ left: `${paddingLeft + barW + 20}px`, top: `${y - 45}px` }}>
            <div className="bg-ink text-canvas rounded-token-md px-4 py-3 shadow-glass min-w-[180px]">
              <p className="text-xs font-black truncate mb-1">{subject.subjectName}</p>
              <p className="text-lg font-black" style={{ color: colors.main }}>{pct.toFixed(1)}%</p>
              <div className="flex gap-3 mt-1.5 text-[10px]">
                <span className="text-success">✅ {subject.attendedSessions || 0} Present</span>
                <span className="text-focus">❌ {subject.absentSessions || 0} Absent</span>
              </div>
              <p className="text-[9px] text-muted mt-1">📅 {taken} taken / {subject.totalSessions || 0} total</p>
            </div>
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-ink rotate-45"></div>
          </div>
        );
      })()}
    </div>
  );
};

export default function AttendanceGraphPopup({ attendanceData, attendanceStats, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHoveringCorner, setIsHoveringCorner] = useState(false);
  const hasData = attendanceData && attendanceData.length > 0;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-300 ease-in-out
        ${isVisible ? 'bg-black/20' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      {/* ========== CARD CONTAINER WITH PERSPECTIVE ========== */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative"
        style={{ width: '70vw', maxWidth: '720px', perspective: '800px' }}
      >

        {/* ========== BACK CARD (surface, underneath) ========== */}
        <div
          className="absolute inset-0 bg-surface rounded-token-xl shadow-neu"
          style={{ zIndex: 1 }}
        />

        {/* ========== FRONT CARD (Main content) ========== */}
        <div
          className={`relative bg-surface-2 rounded-token-xl p-6 z-10 max-h-[85vh] overflow-y-auto
            transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}
          style={{
            overflow: 'visible',
            zIndex: 2,
            transformStyle: 'preserve-3d',
            transformOrigin: 'top right',
          }}
        >

          {/* ========== PAGE CURL CORNER ========== */}
          <div
            className="absolute top-0 right-0"
            style={{ width: '70px', height: '70px', zIndex: 30 }}
            onMouseEnter={() => setIsHoveringCorner(true)}
            onMouseLeave={() => setIsHoveringCorner(false)}
          >
            {/* Curled corner */}
            <div className="absolute top-0 right-0 transition-all duration-700 ease-out"
              style={{
                width: isHoveringCorner ? '50px' : '0px',
                height: isHoveringCorner ? '50px' : '0px',
                background: isHoveringCorner ? 'rgb(var(--brand))' : 'transparent',
                borderRadius: '0 24px 0 0',
                opacity: isHoveringCorner ? 1 : 0,
                boxShadow: isHoveringCorner ? '-2px 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}
            />

            {/* Shadow from curled corner onto back card */}
            {isHoveringCorner && (
              <div
                className="absolute transition-all duration-700 ease-out"
                style={{
                  width: '50px', height: '50px',
                  top: '4px', right: '4px',
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: '0 24px 0 0',
                  zIndex: -1,
                }}
              />
            )}

            {/* Small close button */}
            <button
              onClick={handleClose}
              className="absolute transition-all duration-500 ease-out z-40"
              style={{
                background: isHoveringCorner ? 'rgb(var(--focus))' : 'transparent',
                width: '20px', height: '20px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isHoveringCorner ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                top: isHoveringCorner ? '5px' : '0px',
                right: isHoveringCorner ? '5px' : '0px',
                opacity: isHoveringCorner ? 1 : 0,
                transform: isHoveringCorner ? 'scale(1)' : 'scale(0)',
                pointerEvents: isHoveringCorner ? 'auto' : 'none',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              title="Close"
            >
              <span className="text-on-brand text-[9px] font-bold">✕</span>
            </button>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-ink">Attendance Dashboard</h2>
          </div>

          {hasData ? (
            <>
              <div className="flex justify-center gap-8 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-brand">{attendanceStats.overallPercentage?.toFixed(0)}%</p>
                  <p className="text-[9px] text-muted uppercase tracking-wider">Overall</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-success">{attendanceStats.totalEarned || 0}</p>
                  <p className="text-[9px] text-muted uppercase tracking-wider">Points</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-black ${attendanceStats.subjectsAtRisk > 0 ? 'text-focus' : 'text-success'}`}>
                    {attendanceStats.subjectsAtRisk || 0}
                  </p>
                  <p className="text-[9px] text-muted uppercase tracking-wider">At Risk</p>
                </div>
              </div>

              <div style={{ overflow: 'visible' }}>
                <HorizontalBarChart subjects={attendanceData} />
              </div>

              <p className="text-[7px] text-muted text-center mt-2">Hover over bars for details • Red line = 60% exam eligibility threshold</p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-sm font-bold text-muted">No data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
