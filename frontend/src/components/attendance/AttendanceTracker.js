// src/components/attendance/AttendanceTracker.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { attendanceAPI } from "../../services/api";

export default function AttendanceTracker() {
  const navigate = useNavigate();
  const { attendanceSummary, setAttendanceSummary } = useApp();
  const [subjects, setSubjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('summary');

  // Use data from context if available, otherwise fetch
  useEffect(() => {
    const loadAttendanceData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (attendanceSummary && attendanceSummary.length > 0) {
          setSubjects(attendanceSummary);
          await fetchDashboard();
        } else {
          await Promise.all([fetchSummary(), fetchDashboard()]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError(error.message || 'Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
    // eslint-disable-next-line
  }, []);

  const fetchSummary = async () => {
    try {
      const data = await attendanceAPI.getSummary();
      setSubjects(data || []);
      if (setAttendanceSummary) {
        setAttendanceSummary(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      throw error;
    }
  };

  const fetchDashboard = async () => {
    try {
      const data = await attendanceAPI.getDashboard();
      setDashboard(data || {
        totalSubjects: 0,
        overallPercentage: 0,
        subjectsSafe: 0,
        subjectsAtRisk: 0,
        totalEarned: 0,
        totalPossible: 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      throw error;
    }
  };

  const fetchRecords = async (entryId) => {
    try {
      const data = await attendanceAPI.getRecords(entryId);
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      alert(error.message || 'Failed to load attendance records');
    }
  };

  const fetchTrend = async (entryId) => {
    try {
      const data = await attendanceAPI.getTrend(entryId);
      setTrendData(data || []);
    } catch (error) {
      console.error('Failed to fetch trend:', error);
    }
  };

  const updateAttendance = async (entryId, classDate, status) => {
    try {
      const pointsEarned = status === 'Present' ? 2 : 0;
      await attendanceAPI.updateAttendance(entryId, classDate, status, pointsEarned, '');

      await Promise.all([fetchSummary(), fetchDashboard()]);

      if (selectedSubject) {
        await Promise.all([
          fetchRecords(selectedSubject.entryId),
          fetchTrend(selectedSubject.entryId)
        ]);
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
      alert(error.message || 'Failed to update attendance');
    }
  };

  const generateSessions = async (entryId) => {
    try {
      const data = await attendanceAPI.generateSessions(entryId);
      alert(data.message || 'Sessions generated successfully!');
      await Promise.all([fetchSummary(), fetchDashboard()]);
    } catch (error) {
      console.error('Failed to generate sessions:', error);
      alert(error.message || 'Failed to generate sessions');
    }
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    Promise.all([
      fetchRecords(subject.entryId),
      fetchTrend(subject.entryId)
    ]);
    setShowModal(true);
    setViewMode('summary');
  };

  // Returns token class strings for status coloring
  const getStatusColors = (percentage) => {
    if (percentage >= 80) return { bg: 'bg-success/10', text: 'text-success', border: 'border-success', bar: 'from-success to-success' };
    if (percentage >= 60) return { bg: 'bg-warn/10', text: 'text-warn', border: 'border-warn', bar: 'from-warn to-warn' };
    return { bg: 'bg-focus/10', text: 'text-focus', border: 'border-focus', bar: 'from-focus to-focus' };
  };

  const getStatusBadge = (percentage) => {
    if (percentage >= 80) return '🟢 Safe';
    if (percentage >= 60) return '🟡 Warning';
    return '🔴 At Risk';
  };

  // Donut chart uses computed stroke color via inline style — semantic tokens via CSS var
  const DonutChart = ({ percentage, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const strokeColor = percentage >= 80
      ? 'rgb(var(--success))'
      : percentage >= 60
        ? 'rgb(var(--warn))'
        : 'rgb(var(--focus))';

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--ink)/0.1)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color: strokeColor }}>{percentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  const Sparkline = ({ data, width = 200, height = 40 }) => {
    if (!data || data.length < 2) return null;

    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - (d.runningPercentage / 100) * height
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

    const lastValue = data[data.length - 1]?.runningPercentage || 0;
    const strokeColor = lastValue >= 80
      ? 'rgb(var(--success))'
      : lastValue >= 60
        ? 'rgb(var(--warn))'
        : 'rgb(var(--focus))';

    return (
      <svg width={width} height={height} className="inline-block">
        <defs>
          <linearGradient id={`gradient-${lastValue}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#gradient-${lastValue})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" y1={height * 0.4} x2={width} y2={height * 0.4} stroke="rgb(var(--focus))" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-focus/10 border border-focus/30 rounded-token-lg p-6 text-center">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-xl font-black text-focus mb-2">Error Loading Attendance</h2>
          <p className="text-muted mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="magic-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface rounded-token-md p-5 shadow-neu">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📚</span>
            <span className="text-2xl font-black text-brand">{dashboard?.totalSubjects || subjects.length || 0}</span>
          </div>
          <p className="text-muted text-xs font-bold uppercase tracking-wider">Subjects</p>
        </div>

        <div className="bg-surface rounded-token-md p-5 shadow-neu">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
            <span className="text-2xl font-black text-brand">{dashboard?.overallPercentage || 0}%</span>
          </div>
          <p className="text-muted text-xs font-bold uppercase tracking-wider">Overall</p>
        </div>

        <div className="bg-surface rounded-token-md p-5 shadow-neu">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✅</span>
            <span className="text-2xl font-black text-success">{dashboard?.subjectsSafe || 0}</span>
          </div>
          <p className="text-muted text-xs font-bold uppercase tracking-wider">Safe</p>
        </div>

        <div className="bg-surface rounded-token-md p-5 shadow-neu">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⚠️</span>
            <span className={`text-2xl font-black ${dashboard?.subjectsAtRisk > 0 ? 'text-focus' : 'text-success'}`}>
              {dashboard?.subjectsAtRisk || 0}
            </span>
          </div>
          <p className="text-muted text-xs font-bold uppercase tracking-wider">At Risk</p>
        </div>
      </div>

      {/* Subjects List with Graphs */}
      <div className="bg-surface rounded-token-xl shadow-neu overflow-hidden">
        <div className="px-8 py-6 bg-grad-hero">
          <h2 className="text-on-brand font-black text-xl">Attendance Overview</h2>
          <p className="text-on-brand/80 text-xs mt-1">Click on any subject to view detailed records</p>
        </div>

        <div className="divide-y divide-[rgb(var(--ink)/0.08)]">
          {subjects.map((subject) => {
            const percentage = subject.percentage || 0;
            const colors = getStatusColors(percentage);
            const statusBadge = getStatusBadge(percentage);

            return (
              <div key={subject.entryId} className="p-6 hover:bg-surface-2 cursor-pointer transition-all group">
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <DonutChart percentage={percentage} size={80} strokeWidth={6} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-black text-ink text-lg truncate">{subject.subjectName}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${colors.bg} ${colors.text}`}>
                        {statusBadge}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      📅 {subject.days} | ⏰ {subject.startTime} - {subject.endTime} | 📍 {subject.roomNumber}
                    </p>

                    <div className="flex gap-4 mt-2 text-xs text-muted">
                      <span>✅ {subject.attendedSessions} Present</span>
                      <span>❌ {subject.absentSessions} Absent</span>
                      <span>📅 {subject.upcomingSessions} Upcoming</span>
                    </div>

                    {subject.isWarning && (
                      <div className="mt-2 p-2 bg-focus/10 rounded-token-sm border-l-4 border-focus">
                        <p className="text-xs text-focus font-bold">
                          ⚠️ Below 60% - You may not be eligible for the exam!
                        </p>
                      </div>
                    )}

                    <div className="mt-3 h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-500`}
                        style={{ width: `${percentage}%` }} />
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleSubjectClick(subject); }}
                      className="px-4 py-1.5 bg-brand text-on-brand rounded-token-sm text-xs font-bold hover:scale-105 transition-transform">
                      View Details
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); generateSessions(subject.entryId); }}
                      className="px-4 py-1.5 bg-surface-2 text-muted rounded-token-sm text-xs font-bold hover:scale-105 transition-transform">
                      Generate Sessions
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="p-12 text-center">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-muted font-bold">No subjects found in active calendar</p>
              <button onClick={() => navigate("/academic")} className="mt-4 magic-btn">
                + Add Classes to Calendar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Modal */}
      {showModal && selectedSubject && attendanceData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-token-xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-glass" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[rgb(var(--ink)/0.08)] bg-grad-hero">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-on-brand">{selectedSubject.subjectName}</h3>
                  <p className="text-on-brand/80 text-xs mt-1">{selectedSubject.days} | {selectedSubject.startTime} - {selectedSubject.endTime}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-on-brand hover:scale-110 transition-transform text-2xl">✕</button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 p-4 bg-surface-2">
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: selectedSubject.percentage >= 60 ? 'rgb(var(--success))' : 'rgb(var(--focus))' }}>
                  {selectedSubject.percentage.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted uppercase font-bold">Current</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-brand">
                  {selectedSubject.attendedSessions}/{selectedSubject.totalSessions}
                </p>
                <p className="text-[10px] text-muted uppercase font-bold">Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-info">
                  {attendanceData.stats?.maxPercentage?.toFixed(1) || 0}%
                </p>
                <p className="text-[10px] text-muted uppercase font-bold">Max Possible</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-black ${attendanceData.stats?.canRecover ? 'text-success' : 'text-focus'}`}>
                  {attendanceData.stats?.canRecover ? '✅' : '❌'}
                </p>
                <p className="text-[10px] text-muted uppercase font-bold">Can Recover</p>
              </div>
            </div>

            <div className="flex border-b border-[rgb(var(--ink)/0.08)]">
              <button onClick={() => setViewMode('summary')}
                className={`flex-1 py-3 text-sm font-black transition-all ${viewMode === 'summary' ? 'text-brand border-b-2 border-brand' : 'text-muted'}`}>
                📋 Session Records
              </button>
              <button onClick={() => setViewMode('trend')}
                className={`flex-1 py-3 text-sm font-black transition-all ${viewMode === 'trend' ? 'text-brand border-b-2 border-brand' : 'text-muted'}`}>
                📈 Trend Graph
              </button>
            </div>

            <div className="overflow-y-auto max-h-[45vh] p-4">
              {viewMode === 'summary' ? (
                <div className="space-y-2">
                  {attendanceData.records?.map((record) => (
                    <div key={record.recordId}
                      className={`flex items-center justify-between p-3 rounded-token-sm transition-all ${
                        record.sessionType === 'upcoming' ? 'bg-surface-2 opacity-60' :
                        record.status === 'Present' ? 'bg-success/10 border border-success/20' :
                        record.status === 'Absent' ? 'bg-focus/10 border border-focus/20' :
                        'bg-warn/10 border border-warn/20'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          record.status === 'Present' ? 'bg-success' :
                          record.status === 'Absent' ? 'bg-focus' :
                          record.sessionType === 'upcoming' ? 'bg-[rgb(var(--ink)/0.2)]' : 'bg-warn'
                        }`} />
                        <div>
                          <p className="text-sm font-bold text-ink">{record.formattedDate}</p>
                          <p className="text-xs text-muted">
                            {record.sessionType === 'upcoming' ? '📅 Upcoming' :
                             record.status === 'Pending' ? '⏳ Pending' :
                             `${record.status} • Points: ${record.pointsEarned}/${record.pointsPossible}`}
                          </p>
                        </div>
                      </div>

                      {record.sessionType !== 'upcoming' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateAttendance(selectedSubject.entryId, record.classDate, 'Present')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              record.status === 'Present'
                                ? 'bg-success text-on-brand shadow-neu-sm'
                                : 'bg-surface text-success border border-success/30 hover:bg-success/10'
                            }`}>✓ Present</button>
                          <button onClick={() => updateAttendance(selectedSubject.entryId, record.classDate, 'Absent')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              record.status === 'Absent'
                                ? 'bg-focus text-on-brand shadow-neu-sm'
                                : 'bg-surface text-focus border border-focus/30 hover:bg-focus/10'
                            }`}>✗ Absent</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {trendData.length > 0 ? (
                    <>
                      <div className="bg-surface-2 rounded-token-lg p-6">
                        <h4 className="text-sm font-black text-ink mb-4">Attendance Trend</h4>
                        <div className="flex justify-center">
                          <Sparkline data={trendData} width={500} height={100} />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-muted">
                          <span>{trendData[0]?.date ? new Date(trendData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                          <span className="text-focus font-bold">—— 60% Threshold</span>
                          <span>{trendData[trendData.length - 1]?.date ? new Date(trendData[trendData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-token-lg ${attendanceData.stats?.canRecover ? 'bg-info/10 border border-info/20' : 'bg-focus/10 border border-focus/20'}`}>
                        <h4 className="text-sm font-black text-ink mb-2">
                          {attendanceData.stats?.canRecover ? '📈 Recovery Plan' : '❌ Cannot Recover'}
                        </h4>
                        {attendanceData.stats?.canRecover ? (
                          <div className="space-y-2 text-xs text-ink">
                            <p>You need <strong>{attendanceData.stats.pointsNeeded} more points</strong> to reach 60%</p>
                            <p>That's attending <strong>{attendanceData.stats.sessionsNeeded} more sessions</strong></p>
                            <p>Maximum possible: <strong>{attendanceData.stats.maxPercentage}%</strong></p>
                            <div className="mt-3 h-2 bg-surface rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-focus via-warn to-success rounded-full"
                                   style={{ width: `${Math.min(attendanceData.stats.maxPercentage, 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-focus font-bold">
                            Even if you attend all remaining classes, you cannot reach 60%. Please contact your instructor.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted">
                      <p>No trend data available yet. Mark attendance for past sessions to see trends.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
