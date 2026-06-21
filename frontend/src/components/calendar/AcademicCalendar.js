// src/components/calendar/AcademicCalendar.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Lottie from "lottie-react";
import fireAnimation from "../../assets/animation/work managemnt.json";
import AttendanceGraphPopup from "./AttendanceGraphPopup";

export default function AcademicCalendar() {
  const navigate = useNavigate();
  const { todaysClasses, attendanceSummary } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classCount, setClassCount] = useState(0);
  const [classDetails, setClassDetails] = useState([]);
  const [showGraphPopup, setShowGraphPopup] = useState(false);

  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    overallPercentage: 0, subjectsAtRisk: 0, totalSubjects: 0, totalEarned: 0, totalPossible: 0
  });

  // Use data from context instead of fetching
  useEffect(() => {
    if (todaysClasses && todaysClasses.length > 0) {
      setClassCount(todaysClasses.length);
      setClassDetails(todaysClasses);
    } else {
      setClassCount(0);
      setClassDetails([]);
    }

    if (attendanceSummary && attendanceSummary.length > 0) {
      setAttendanceData(attendanceSummary);

      const totalSubjects = attendanceSummary.length;
      let totalEarned = 0;
      let totalPossible = 0;
      let subjectsAtRisk = 0;
      let subjectsSafe = 0;
      let overallPercentageSum = 0;

      attendanceSummary.forEach(subject => {
        const percentage = subject.percentage || 0;
        overallPercentageSum += percentage;

        totalEarned += subject.totalPointsEarned || 0;
        totalPossible += subject.totalPointsPossible || 0;

        if (percentage < 60) {
          subjectsAtRisk++;
        } else if (percentage >= 75) {
          subjectsSafe++;
        }
      });

      const overallPercentage = totalSubjects > 0 ? overallPercentageSum / totalSubjects : 0;

      setAttendanceStats({
        overallPercentage: overallPercentage,
        subjectsAtRisk: subjectsAtRisk,
        totalSubjects: totalSubjects,
        totalEarned: totalEarned,
        totalPossible: totalPossible,
        subjectsSafe: subjectsSafe
      });
    }

    setLoading(false);
  }, [todaysClasses, attendanceSummary]);

  const getOverallStatus = () => {
    const pct = attendanceStats.overallPercentage || 0;
    if (pct >= 80) return { emoji: '🟢', colorCls: 'text-success' };
    if (pct >= 60) return { emoji: '🟡', colorCls: 'text-warn' };
    return { emoji: '🔴', colorCls: 'text-focus' };
  };

  if (loading) {
    return (
      <div className="relative bg-surface p-10 rounded-token-xl flex-1 min-w-[320px] max-w-[450px] shadow-neu transition-all duration-500 text-center group hover:-translate-y-2 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const hasAttendanceData = attendanceData && attendanceData.length > 0;

  return (
    <>
      <div className="relative bg-surface p-10 rounded-token-xl flex-1 min-w-[320px] max-w-[450px] shadow-neu transition-all duration-500 text-center group hover:-translate-y-2 min-h-[280px]">

        {/* Tooltip */}
        {showTooltip && classDetails.length > 0 && (
          <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+16px)] w-60 bg-surface rounded-token-lg shadow-glass p-4 z-50 text-left">
            <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-surface rotate-45" />
            <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-3">Today's lineup</p>
            <div className="flex flex-col gap-2">
              {classDetails.map((item, i) => (
                <div key={i} className="flex items-start gap-2 bg-surface-2 rounded-token-sm px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-ink truncate">{item.subject || item.name || "Class"}</p>
                    <p className="text-[10px] text-muted font-medium mt-0.5">
                      {item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : item.time || "No time set"}
                    </p>
                    {item.room && <p className="text-[10px] text-brand font-bold mt-0.5">📍 {item.room}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col items-center justify-center h-full">
          <h3 className="text-xl font-black text-ink mb-2">Classes Today</h3>
          <div className="w-40 h-40">
            <Lottie animationData={fireAnimation} loop={true} className="w-full h-full" />
          </div>

          <div className="cursor-pointer select-none"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}>
            <p className="text-muted font-bold mt-2 mb-2">
              {classCount === 0 ? "No classes today 🎉" : `${classCount} ${classCount === 1 ? "class" : "classes"} scheduled`}
            </p>
          </div>

          {hasAttendanceData && (
            <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-surface-2 rounded-token-sm">
              <span className="text-sm">{overallStatus.emoji}</span>
              <span className={`text-xs font-black ${overallStatus.colorCls}`}>
                {attendanceStats.overallPercentage?.toFixed(1)}% Overall
              </span>
            </div>
          )}

          <button className="magic-btn" onClick={() => navigate("/academic")}>
            <span className="icon">✏️</span>
            <span className="text">Edit Calendar</span>
          </button>
        </div>

        {/* Graph Button */}
        <button
          className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-grad-hero text-on-brand text-xl flex items-center justify-center z-10 shadow-neu hover:scale-110 hover:rotate-12 transition-transform"
          onClick={() => setShowGraphPopup(true)}
          title="View Attendance Graphs"
        >
          📊
        </button>
      </div>

      {/* ========== POPUP MODAL ========== */}
      {showGraphPopup && (
        <AttendanceGraphPopup
          attendanceData={attendanceData}
          attendanceStats={attendanceStats}
          onClose={() => setShowGraphPopup(false)}
        />
      )}
    </>
  );
}
