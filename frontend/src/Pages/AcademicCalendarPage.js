import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/context/AppContext";
import AcadmicCalenAddsection from "../components/calendar/AcadmicCalenAddsection";
import AcadmicCalenNewCal from "../components/calendar/AcadmicCalenNewCal";
import { calendarAPI, getToken } from "../services/api";

export default function AcademicCalendarPage() {
  const navigate = useNavigate();
  const { setCalendar } = useApp();

  const [calendars, setCalendarsRaw] = useState([]);
  const [activeCalendarId, setActiveCalendarIdRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendars = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        const fetchedCalendars = await calendarAPI.getAll();
        setCalendarsRaw(fetchedCalendars);
        
        const activeCal = fetchedCalendars.find(c => c.isActive === true);
        if (activeCal) {
          setActiveCalendarIdRaw(activeCal.id);
        } else if (fetchedCalendars.length > 0) {
          setActiveCalendarIdRaw(fetchedCalendars[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch calendars:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalendars();
  }, []);

  const setCalendars = (val) => {
    const next = typeof val === "function" ? val(calendars) : val;
    setCalendarsRaw(next);
  };

  const setActiveCalendarId = (val) => {
    setActiveCalendarIdRaw(val);
  };

  const activeCalendar = calendars.find(c => c.id === activeCalendarId);

  const handleCreateNewCalendar = async (title) => {
    try {
      const result = await calendarAPI.create(title);
      const newCalendar = result.calendar;
      
      setCalendars(prev => [...prev, newCalendar]);
      setActiveCalendarId(newCalendar.id);
    } catch (error) {
      console.error('Failed to create calendar:', error);
      alert('Failed to create calendar. Please try again.');
    }
  };

  const handleAddEntry = async ({ subject, startTime, endTime, lrNo, days }) => {
    try {
      const result = await calendarAPI.addEntry(activeCalendarId, {
        subject,
        startTime,
        endTime,
        lrNo,
        days
      });
      
      setCalendar(prev => [...prev, result.entry]);
    } catch (error) {
      console.error('Failed to add entry:', error);
      alert('Failed to add subject. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">
        <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">
        <PageHeader />
        <AcadmicCalenNewCal
          isEmpty
          onCreateNewCalendar={handleCreateNewCalendar}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-10 pb-20 max-w-[1400px] mx-auto min-h-screen bg-[#F1F5F9]">
      <PageHeader />

      <AcadmicCalenAddsection
        activeCalendar={activeCalendar}
        onAddEntry={handleAddEntry}
        onCreateNewCalendar={handleCreateNewCalendar}
      />

      <footer className="w-full flex justify-center gap-6 px-4 mt-4 flex-wrap">
        <button onClick={() => navigate("/academic/view")} className="magic-btn flex items-center gap-2">
          📅 View Calendars →
        </button>
        <button onClick={() => navigate("/dashboard")} className="magic-btn flex items-center gap-2">
          🏠 Dashboard
        </button>
      </footer>
    </div>
  );
}

function PageHeader() {
  return (
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
  );
}