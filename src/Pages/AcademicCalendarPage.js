import React, { useState } from "react";

export default function AcademicCalendarPage({ setView, calendar, setCalendar }) {
  const [subject, setSubject] = useState("");
  const [startTime, setStartTime] = useState(""); 
  const [endTime, setEndTime] = useState("");     
  const [lrNo, setLrNo] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);

  const displayDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Logic to get dates for the current week
  const getDayDate = (dayName) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Adjust so Monday is index 0
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const dayMap = { "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6 };
    const targetOffset = mondayOffset + dayMap[dayName];
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + targetOffset);
    
    return targetDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  };

  const formatTimeStr = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!subject || !startTime || !endTime || !lrNo || selectedDays.length === 0) {
      return alert("Please fill all fields and select at least one day!");
    }

    const newEntry = {
      id: Date.now(),
      subject,
      startTime,
      endTime,
      lrNo,
      days: selectedDays,
    };

    setCalendar([...calendar, newEntry]);
    setSubject(""); setStartTime(""); setEndTime(""); setLrNo(""); setSelectedDays([]);
  };

  const deleteEntry = (id) => {
    setCalendar(calendar.filter(item => item.id !== id));
  };

  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">
      
      {/* Header Section */}
      <header className="w-full max-w-[1100px] mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-[#7C3AED] tracking-[0.2em] uppercase mb-3 drop-shadow-sm">
          Academic Time Table
        </h1>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
          <p className="text-sm font-bold tracking-[0.3em] text-gray-400 uppercase">
            Spring <span className="text-[#7C3AED]">( 2026 )</span>
          </p>
          <div className="h-[2px] w-12 bg-gray-300 rounded-full"></div>
        </div>
      </header>

      {/* Add New Activity Section */}
      <div className="w-full max-w-[1000px] bg-[#F1F5F9] p-10 rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] mb-16 border border-white/50">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">✍️</span>
          <h2 className="text-2xl font-black text-[#1E293B] tracking-tight">Add Subject</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-8">
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. COMPUTER ARTITECTURE"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-5 rounded-2xl bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] outline-none font-bold text-gray-500 placeholder:text-gray-300 border-none focus:ring-2 ring-purple-100/50 transition-all"
            />
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Select Days:</p>
            <div className="flex flex-wrap gap-3">
              {allDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-6 py-2 rounded-xl font-bold text-xs transition-all 
                    ${selectedDays.includes(day) 
                      ? "text-[#7C3AED] shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] bg-[#F1F5F9]" 
                      : "text-gray-400 bg-[#F1F5F9] shadow-[4px_4px_8px_#d1d9e6,-4px_-4px_8px_#ffffff] hover:scale-105"}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-6 flex items-center justify-between bg-[#F1F5F9] shadow-[inset_6px_6px_12px_#d1d9e6,inset_-6px_-6px_12px_#ffffff] rounded-2xl p-4 px-6">
              <div className="flex items-center gap-3">
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-transparent font-bold text-gray-500 outline-none cursor-pointer" />
              </div>
              <span className="text-gray-300 font-bold text-xs uppercase tracking-widest">to</span>
              <div className="flex items-center gap-3">
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-transparent font-bold text-gray-500 outline-none cursor-pointer" />
              </div>
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
              <button type="submit" className="w-full bg-[#F1F5F9] text-[#7C3AED] py-4 rounded-2xl font-black uppercase text-sm shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] active:scale-95 transition-all tracking-widest">
                Add to Flow
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* RE-STYLED TABLE VIEW */}
      <div className="w-full overflow-x-auto rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] border border-white/50 bg-[#F1F5F9] mb-12">
        <div className="min-w-[1000px] grid grid-cols-5 border-collapse">
          {displayDays.map((day, index) => (
            <div key={day} className={`flex flex-col ${index !== 4 ? 'border-r-2 border-[#7C3AED]/10' : ''}`}>
              {/* Header Cell with Brand Purple underline and Dynamic Date */}
              <div className="p-6 text-center border-b-2 border-[#7C3AED]/20">
                <div className="font-black text-gray-800 uppercase tracking-[0.2em] text-sm">
                  {day}
                </div>
                <div className="text-[10px] font-bold text-[#7C3AED] mt-1 opacity-70">
                   {getDayDate(day)}
                </div>
              </div>
              
              {/* Schedule Entries */}
              <div className="p-4 space-y-4 min-h-[500px]">
                {calendar
                  .filter(item => item.days.includes(day))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(item => (
                    <div key={item.id} className="group relative p-4 rounded-2xl bg-[#F1F5F9] shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff] hover:shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff] transition-all duration-300">
                      <button onClick={() => deleteEntry(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10">✕</button>
                      
                      <h4 className="font-black text-[#1E293B] text-[11px] leading-tight mb-3 uppercase border-b border-gray-200/50 pb-1">
                        {item.subject}
                      </h4>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                          <span className="text-[#7C3AED]">●</span>
                          {formatTimeStr(item.startTime)} - {formatTimeStr(item.endTime)}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-black text-[#1E293B] bg-white/40 self-start px-2 py-1 rounded-md border border-white/60">
                          <div className="flex flex-col items-center justify-center translate-y-[1px]">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
                            <div className="w-[1.5px] h-2 bg-gray-400"></div>
                          </div>
                          <span className="tracking-wider uppercase text-gray-500">{item.lrNo}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="w-full flex justify-center px-4">
        <div className="flex flex-row items-center gap-8">
          <button onClick={() => setView("dashboard")} className="bg-[#F1F5F9] text-[#7C3AED] py-4 px-10 rounded-[22px] font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap hover:-translate-y-1 shadow-[6px_6px_12px_#d1d9e6,-4px_-4px_10px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]"> 
            🏠 Dashboard 
          </button>
          {calendar.length > 0 && (
            <button onClick={() => {if(window.confirm("Delete all entries?")) setCalendar([])}} className="bg-[#F1F5F9] text-red-500 py-4 px-10 rounded-[22px] font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap hover:-translate-y-1 shadow-[6px_6px_12px_#d1d9e6,-4px_-4px_10px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d9e6,inset_-4px_-4px_8px_#ffffff]">
              🗑️ Delete Calendar
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}