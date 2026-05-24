import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../services/api";

export default function AttendanceTracker() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('summary');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([fetchSummary(), fetchDashboard()]);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
    // eslint-disable-next-line
  }, []);

  const fetchSummary = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5555/api/attendance/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5555/api/attendance/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  };

  const fetchRecords = async (entryId) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5555/api/attendance/records/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  };

  const fetchTrend = async (entryId) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5555/api/attendance/trend/${entryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTrendData(data);
    } catch (error) {
      console.error('Failed to fetch trend:', error);
    }
  };

  const updateAttendance = async (entryId, classDate, status) => {
    try {
      const token = getToken();
      const pointsEarned = status === 'Present' ? 2 : 0;
      await fetch(`http://localhost:5555/api/attendance/${entryId}/${classDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, pointsEarned, remarks: '' })
      });
      
      fetchSummary();
      fetchDashboard();
      if (selectedSubject) {
        fetchRecords(selectedSubject.entryId);
        fetchTrend(selectedSubject.entryId);
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
    }
  };

  const generateSessions = async (entryId) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5555/api/attendance/generate/${entryId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      alert(data.message);
      fetchSummary();
      fetchDashboard();
    } catch (error) {
      console.error('Failed to generate sessions:', error);
    }
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    fetchRecords(subject.entryId);
    fetchTrend(subject.entryId);
    setShowModal(true);
    setViewMode('summary');
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 80) return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-500', bar: 'from-green-400 to-green-500' };
    if (percentage >= 60) return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-500', bar: 'from-yellow-400 to-yellow-500' };
    return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-500', bar: 'from-red-400 to-red-500' };
  };

  const getStatusBadge = (percentage) => {
    if (percentage >= 80) return '🟢 Safe';
    if (percentage >= 60) return '🟡 Warning';
    return '🔴 At Risk';
  };

  const DonutChart = ({ percentage, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const color = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{percentage.toFixed(1)}%</span>
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
    const color = lastValue >= 80 ? '#10b981' : lastValue >= 60 ? '#f59e0b' : '#ef4444';

    return (
      <svg width={width} height={height} className="inline-block">
        <defs>
          <linearGradient id={`gradient-${lastValue}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#gradient-${lastValue})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="0" y1={height * 0.4} x2={width} y2={height * 0.4} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📚</span>
            <span className="text-2xl font-black text-focusPurple">{dashboard?.totalSubjects || 0}</span>
          </div>
          <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">Subjects</p>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
            <span className="text-2xl font-black text-focusPurple">{dashboard?.overallPercentage || 0}%</span>
          </div>
          <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">Overall</p>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✅</span>
            <span className="text-2xl font-black text-green-600">{dashboard?.subjectsSafe || 0}</span>
          </div>
          <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">Safe</p>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⚠️</span>
            <span className={`text-2xl font-black ${dashboard?.subjectsAtRisk > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {dashboard?.subjectsAtRisk || 0}
            </span>
          </div>
          <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">At Risk</p>
        </div>
      </div>

      {/* Subjects List with Graphs */}
      <div className="bg-white rounded-[40px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-focusPurple to-purple-400">
          <h2 className="text-white font-black text-xl">Attendance Overview</h2>
          <p className="text-white/80 text-xs mt-1">Click on any subject to view detailed records</p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {subjects.map((subject) => {
            const percentage = subject.percentage || 0;
            const colors = getStatusColor(percentage);
            const statusBadge = getStatusBadge(percentage);
            
            return (
              <div key={subject.entryId} className="p-6 hover:bg-gray-50 cursor-pointer transition-all group">
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <DonutChart percentage={percentage} size={80} strokeWidth={6} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-black text-gray-800 text-lg truncate">{subject.subjectName}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${colors.bg} ${colors.text}`}>
                        {statusBadge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      📅 {subject.days} | ⏰ {subject.startTime} - {subject.endTime} | 📍 {subject.roomNumber}
                    </p>
                    
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>✅ {subject.attendedSessions} Present</span>
                      <span>❌ {subject.absentSessions} Absent</span>
                      <span>📅 {subject.upcomingSessions} Upcoming</span>
                    </div>
                    
                    {subject.isWarning && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg border-l-4 border-red-500">
                        <p className="text-xs text-red-600 font-bold">
                          ⚠️ Below 60% - You may not be eligible for the exam!
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-500`}
                        style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleSubjectClick(subject); }}
                      className="px-4 py-1.5 bg-focusPurple text-white rounded-xl text-xs font-bold hover:scale-105 transition-transform">
                      View Details
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); generateSessions(subject.entryId); }}
                      className="px-4 py-1.5 bg-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:scale-105 transition-transform">
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
              <p className="text-gray-400 font-bold">No subjects found in active calendar</p>
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
          <div className="bg-white rounded-[40px] max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-focusPurple to-purple-400">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white">{selectedSubject.subjectName}</h3>
                  <p className="text-white/80 text-xs mt-1">{selectedSubject.days} | {selectedSubject.startTime} - {selectedSubject.endTime}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white hover:scale-110 transition-transform text-2xl">✕</button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50">
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: selectedSubject.percentage >= 60 ? '#10b981' : '#ef4444' }}>
                  {selectedSubject.percentage.toFixed(1)}%
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Current</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-focusPurple">
                  {selectedSubject.attendedSessions}/{selectedSubject.totalSessions}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">
                  {attendanceData.stats?.maxPercentage?.toFixed(1) || 0}%
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Max Possible</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-black ${attendanceData.stats?.canRecover ? 'text-green-600' : 'text-red-600'}`}>
                  {attendanceData.stats?.canRecover ? '✅' : '❌'}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Can Recover</p>
              </div>
            </div>
            
            <div className="flex border-b border-gray-200">
              <button onClick={() => setViewMode('summary')}
                className={`flex-1 py-3 text-sm font-black transition-all ${viewMode === 'summary' ? 'text-focusPurple border-b-2 border-focusPurple' : 'text-gray-400'}`}>
                📋 Session Records
              </button>
              <button onClick={() => setViewMode('trend')}
                className={`flex-1 py-3 text-sm font-black transition-all ${viewMode === 'trend' ? 'text-focusPurple border-b-2 border-focusPurple' : 'text-gray-400'}`}>
                📈 Trend Graph
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[45vh] p-4">
              {viewMode === 'summary' ? (
                <div className="space-y-2">
                  {attendanceData.records?.map((record) => (
                    <div key={record.recordId}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        record.sessionType === 'upcoming' ? 'bg-gray-50 opacity-60' :
                        record.status === 'Present' ? 'bg-green-50 border border-green-200' :
                        record.status === 'Absent' ? 'bg-red-50 border border-red-200' :
                        'bg-yellow-50 border border-yellow-200'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          record.status === 'Present' ? 'bg-green-500' :
                          record.status === 'Absent' ? 'bg-red-500' :
                          record.sessionType === 'upcoming' ? 'bg-gray-300' : 'bg-yellow-500'
                        }`} />
                        <div>
                          <p className="text-sm font-bold text-gray-800">{record.formattedDate}</p>
                          <p className="text-xs text-gray-500">
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
                                ? 'bg-green-500 text-white shadow-lg' 
                                : 'bg-white text-green-600 border border-green-300 hover:bg-green-100'
                            }`}>✓ Present</button>
                          <button onClick={() => updateAttendance(selectedSubject.entryId, record.classDate, 'Absent')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              record.status === 'Absent' 
                                ? 'bg-red-500 text-white shadow-lg' 
                                : 'bg-white text-red-600 border border-red-300 hover:bg-red-100'
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
                      <div className="bg-gray-50 rounded-2xl p-6">
                        <h4 className="text-sm font-black text-gray-800 mb-4">Attendance Trend</h4>
                        <div className="flex justify-center">
                          <Sparkline data={trendData} width={500} height={100} />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                          <span>{trendData[0]?.date ? new Date(trendData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                          <span className="text-red-400 font-bold">—— 60% Threshold</span>
                          <span>{trendData[trendData.length - 1]?.date ? new Date(trendData[trendData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-2xl ${attendanceData.stats?.canRecover ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
                        <h4 className="text-sm font-black mb-2">
                          {attendanceData.stats?.canRecover ? '📈 Recovery Plan' : '❌ Cannot Recover'}
                        </h4>
                        {attendanceData.stats?.canRecover ? (
                          <div className="space-y-2 text-xs">
                            <p>You need <strong>{attendanceData.stats.pointsNeeded} more points</strong> to reach 60%</p>
                            <p>That's attending <strong>{attendanceData.stats.sessionsNeeded} more sessions</strong></p>
                            <p>Maximum possible: <strong>{attendanceData.stats.maxPercentage}%</strong></p>
                            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" 
                                   style={{ width: `${Math.min(attendanceData.stats.maxPercentage, 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-red-600 font-bold">
                            Even if you attend all remaining classes, you cannot reach 60%. Please contact your instructor.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
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