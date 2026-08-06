import React from 'react';

export const SubjectRowChart = ({ score, stat }) => {
  if (!stat) return <div className="h-full w-full"></div>;
  const scorePos = Math.min(100, Math.max(0, score));
  const avgPos = Math.min(100, Math.max(0, stat.avg));
  const q1Pos = Math.min(100, Math.max(0, stat.q1)); // 左
  const medianPos = Math.min(100, Math.max(0, stat.median));
  const q3Pos = Math.min(100, Math.max(0, stat.q3)); // 右
  
  const boxWidth = Math.max(0.1, q3Pos - q1Pos); 
  const hasScore = score !== undefined && score !== null && score !== '';

  // 判斷是否落在後25% (小於等於 Q1)，若是則圓點再放大 25% (4.375 * 1.25 ≈ 5.47)
  const isBottom25 = hasScore && Number(score) <= stat.q1;
  const circleRadius = isBottom25 ? 5.47 : 3.5;

  return (
    <div className="relative h-full w-full flex items-center text-black">
      <svg width="100%" height="100%" className="absolute inset-0 block text-black" style={{ overflow: 'visible' }}>
        {/* 0-100 貫穿橫線 */}
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#9ca3af" strokeWidth="1" />

        {/* 箱體 */}
        <rect x={`${q1Pos}%`} y="30%" width={`${boxWidth}%`} height="40%" fill="black" />
        
        {/* 中位數白線 */}
        <line x1={`${medianPos}%`} y1="30%" x2={`${medianPos}%`} y2="70%" stroke="white" strokeWidth="1.2" />
        
        {/* 個人分數 */}
        {hasScore && <circle cx={`${scorePos}%`} cy="50%" r={circleRadius} fill="white" stroke="black" strokeWidth="1.2" />}
        
        {/* 班平均 */}
        <svg x={`${avgPos}%`} y="50%" width="0" height="0" style={{ overflow: 'visible' }}>
           <polygon points="0,-3.5 3.5,0 0,3.5 -3.5,0" fill="#f3f4f6" stroke="black" strokeWidth="1" />
        </svg>
        
        {/* 箱體外框 */}
        <rect x={`${q1Pos}%`} y="30%" width={`${boxWidth}%`} height="40%" fill="none" stroke="black" strokeWidth="1.5" rx="0.5" />
      </svg>
    </div>
  );
};
