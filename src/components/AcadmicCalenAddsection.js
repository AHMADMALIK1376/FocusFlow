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
    <div className="w-full max-w-[1000px] bg-[#F1F5F9] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] mb-6 border border-white/50">

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
          className="w-full p-5 rounded-2xl bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-500 placeholder:text-gray-300 border-none transition-all"
        />

        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Select Days:</p>
          <div className="flex flex-wrap gap-3">
            {allDays.map((day) => (
              <button key={day} type="button" onClick={() => toggleDay(day)}
                className={`px-6 py-2 rounded-xl font-bold text-xs transition-all bg-[#F1F5F9]
                  ${selectedDays.includes(day)
                    ? "text-[#7C3AED] shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]"
                    : "text-gray-400 shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] hover:scale-105"}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-6 flex items-center justify-between bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] rounded-2xl p-4 px-6">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent font-bold text-gray-500 outline-none cursor-pointer" />
            <span className="text-gray-300 font-bold text-xs uppercase tracking-widest">to</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent font-bold text-gray-500 outline-none cursor-pointer" />
          </div>
          <div className="md:col-span-3">
            <input
              type="text"
              placeholder="LR / LAB"
              value={lrNo}
              onChange={(e) => setLrNo(e.target.value)}
              className="w-full p-4 rounded-2xl bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-500 text-center uppercase border-none"
            />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="magic-btn px-8 py-3.5  rounded-2xl bg-[#f0f2f5] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] text-focusPurple font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(108,92,231,0.2)] active:scale-95 active:shadow-inner">
              Add to Flow
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}