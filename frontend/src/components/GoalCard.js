import React, { useState, useEffect } from "react";
import { useApp } from "./AppContext";
import { dashboardAPI, getToken, taskAPI } from "../services/api";

export default function GoalCard() {
  const { completedGoals, setCompletedGoals } = useApp();
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        
        const statsData = await dashboardAPI.getStats();
        if (statsData && statsData.totalGoalsCompleted !== undefined) {
          setCompletedGoals(statsData.totalGoalsCompleted);
        }
        
        const tasks = await taskAPI.getAll();
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        setTaskStats({ total, completed, pending });
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [setCompletedGoals]);

  const completionPercentage = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;
  const pendingPercentage = 100 - completionPercentage;
  
  // Concentric Donut Chart parameters
  const size = 240;
  const center = size / 2;
  
  // Layer 1: Completed tasks (inner ring)
  const radius1 = 80;
  const strokeWidth1 = 24;
  const circumference1 = 2 * Math.PI * radius1;
  const completedDash = (completionPercentage / 100) * circumference1;
  
  // Layer 2: Pending tasks (outer ring)
  const radius2 = 108;
  const strokeWidth2 = 24;
  const circumference2 = 2 * Math.PI * radius2;
  const pendingDash = (pendingPercentage / 100) * circumference2;

  // Calculate angle for text placement (at the end of the arc)
  const completedAngle = (completionPercentage / 100) * 360;
  const pendingAngle = (pendingPercentage / 100) * 360;
  
  // Position for Completed text (at the end of the completed arc)
  const completedRad = (completedAngle - 90) * Math.PI / 180;
  const completedTextX = center + (radius1 + 12) * Math.cos(completedRad);
  const completedTextY = center + (radius1 + 12) * Math.sin(completedRad);
  
  // Position for Pending text (at the end of the pending arc)
  const pendingRad = (pendingAngle - 90) * Math.PI / 180;
  const pendingTextX = center + (radius2 + 14) * Math.cos(pendingRad);
  const pendingTextY = center + (radius2 + 14) * Math.sin(pendingRad);

  if (loading) {
    return (
      <div className="relative bg-[#f0f2f5] p-6 rounded-[40px] min-w-[320px] max-w-[450px] min-h-[400px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 overflow-hidden text-center group hover:-translate-y-2 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-focusPurple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      className="relative bg-[#f0f2f5] p-6 rounded-[40px] min-w-[320px] max-w-[450px] min-h-[400px] shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff] transition-all duration-500 overflow-hidden text-center group hover:-translate-y-2 flex flex-col justify-center items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* Header - Centered */}
      <div className="text-center mb-3">
        <h3 className="text-base font-black text-gray-800">Task Progress</h3>
        <p className="text-[9px] text-gray-400">{completedGoals} goals achieved</p>
      </div>

      {/* Centered Concentric Donut Chart */}
      <div className="flex justify-center items-center mb-3">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
            {/* Background circle for outer ring */}
            <circle
              cx={center}
              cy={center}
              r={radius2}
              fill="none"
              stroke="#e8e8e8"
              strokeWidth={strokeWidth2}
              opacity="0.4"
            />
            
            {/* Layer 2: Pending tasks ring (outer) */}
            <circle
              cx={center}
              cy={center}
              r={radius2}
              fill="none"
              stroke="#ff9800"
              strokeWidth={strokeWidth2}
              strokeDasharray={`${pendingDash} ${circumference2}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Background circle for inner ring */}
            <circle
              cx={center}
              cy={center}
              r={radius1}
              fill="none"
              stroke="#e8e8e8"
              strokeWidth={strokeWidth1}
              opacity="0.4"
            />
            
            {/* Layer 1: Completed tasks ring (inner) */}
            <circle
              cx={center}
              cy={center}
              r={radius1}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth={strokeWidth1}
              strokeDasharray={`${completedDash} ${circumference1}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-1000 ease-out"
            />
            
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6c5ce7" />
                <stop offset="100%" stopColor="#a29bfe" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Percentage text at the end of the completed ring */}
          {completionPercentage > 0 && completionPercentage < 100 && (
            <div 
              className="absolute text-white font-black text-sm bg-focusPurple/80 px-2 py-1 rounded-full shadow-md whitespace-nowrap"
              style={{
                left: `${completedTextX}px`,
                top: `${completedTextY}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {Math.round(completionPercentage)}%
            </div>
          )}
          
          {/* Percentage text at the end of the pending ring */}
          {pendingPercentage > 0 && pendingPercentage < 100 && (
            <div 
              className="absolute text-white font-black text-sm bg-orange-500/80 px-2 py-1 rounded-full shadow-md whitespace-nowrap"
              style={{
                left: `${pendingTextX}px`,
                top: `${pendingTextY}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {Math.round(pendingPercentage)}%
            </div>
          )}
          
          {/* Center content - Numbers only (removed labels) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-focusPurple">{taskStats.completed}</span>
            <div className="w-8 h-px bg-gray-200 my-1"></div>
            <span className="text-base font-bold text-orange-500">{taskStats.pending}</span>
          </div>
        </div>
      </div>

      {/* Professional subtle animation - Pulse effect on hover */}
      <div className="flex justify-center items-center gap-2 mt-2">
        <div className={`w-2 h-2 rounded-full bg-green-500 transition-all duration-300 ${isHovered ? 'scale-150' : ''}`}>
          <div className={`w-full h-full rounded-full bg-green-500 animate-pulse opacity-75 ${isHovered ? 'opacity-100' : ''}`}></div>
        </div>
        <span className={`text-[8px] font-medium text-gray-500 uppercase tracking-wider transition-all duration-300 ${isHovered ? 'tracking-widest text-focusPurple' : ''}`}>
          {isHovered ? 'ACTIVE' : 'UPDATED'}
        </span>
      </div>
    </div>
  );
}