import React, { useState } from "react";
import AcadmicCalenNewCal from "./AcadmicCalenNewCal";

const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AcadmicCalenAddsection({
  activeCalendar,
  onAddEntry,
  onCreateNewCalendar,
}) {
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!subject || !startTime || !endTime || !lrNo || selectedDays.length === 0)
      return alert("Please fill all fields and select at least one day!");
    onAddEntry({ subject, startTime, endTime, lrNo, days: selectedDays });
    setSubject(""); setStartTime(""); setEndTime(""); setLrNo(""); setSelectedDays([]);
  };

  return (
    <div className="w-full max-w-[1000px] bg-surface p-10 rounded-token-xl shadow-neu mb-6 border border-[rgb(var(--ink)/0.08)]">

      {/* Header + New Calendar section */}
      <AcadmicCalenNewCal
        activeCalendar={activeCalendar}
        onCreateNewCalendar={onCreateNewCalendar}
      />

      {/* Add Subject Form */}
      <form onSubmit={handleCreate} className="space-y-8">
        <input
          type="text"
          placeholder="e.g. COMPUTER ARCHITECTURE"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full p-5 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-bold text-ink placeholder:text-muted border-none transition-all"
        />

        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-1">Select Days:</p>
          <div className="flex flex-wrap gap-3">
            {allDays.map((day) => (
              <button key={day} type="button" onClick={() => toggleDay(day)}
                className={`px-6 py-2 rounded-token-sm font-bold text-xs transition-all
                  ${selectedDays.includes(day)
                    ? "bg-grad-hero text-on-brand shadow-neu-sm"
                    : "bg-surface-2 text-muted shadow-neu-sm hover:scale-105"}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-6 flex items-center justify-between bg-surface-2 shadow-neu-inset rounded-token-md p-4 px-6">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent font-bold text-ink outline-none cursor-pointer" />
            <span className="text-muted font-bold text-xs uppercase tracking-widest">to</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent font-bold text-ink outline-none cursor-pointer" />
          </div>
          <div className="md:col-span-3">
            <input
              type="text"
              placeholder="LR / LAB"
              value={lrNo}
              onChange={(e) => setLrNo(e.target.value)}
              className="w-full p-4 rounded-token-md bg-surface-2 shadow-neu-inset outline-none font-bold text-ink text-center uppercase border-none"
            />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="magic-btn w-full">
              Add to Flow
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
