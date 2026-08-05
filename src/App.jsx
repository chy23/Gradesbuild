import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileUp, Download, Printer, Users, ChevronLeft, ChevronRight, 
  AlertCircle, Loader2, BarChart3, List, Layers, FileDown, Zap, 
  BookOpen, ShieldCheck, Check, X, ExternalLink, QrCode, Image as ImageIcon,
  ZoomIn, ZoomOut, Search, Maximize2, Layers3
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * 成績單產生器 v4.43.1 (Force Deploy)
 * 1. 修正 semesterInfo 初始狀態，確保 grade 與 classNumber 有預設值，解決 Uncontrolled Input 警告。
 * 2. 確保檔名解析 (parseFilenameInfo) 能正確分離年級與班號。
 * 3. 確保成績單標題正確組合年級與班號。
 * 4. 維持所有先前的版面與功能設定。
 */

// --- 工具函數：計算統計數據 ---
const calculateStats = (data, subjectKey) => {
  const validValues = data
    .map(s => s[subjectKey])
    .filter(val => val !== undefined && val !== null && val !== ''); 

  const scores = validValues.map(val => Number(val))
    .filter(val => !isNaN(val)) 
    .sort((a, b) => a - b);

  // 初始化級距
  const dist = { '100': 0, '90-99': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };

  if (scores.length === 0) return { avg: 0, stdDev: 0, min: 0, max: 0, q1: 0, median: 0, q3: 0, minVal: 0, maxVal: 0, dist };

  const count = scores.length;
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = sum / count;
  
  // Q1 為低分端 (25th)，Q3 為高分端 (75th)
  const q1 = scores[Math.floor((count - 1) * 0.25)]; 
  const q3 = scores[Math.floor((count - 1) * 0.75)]; 
  const mid = Math.floor(count / 2);
  const median = count % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
  
  const minVal = scores[0];
  const maxVal = scores[count - 1];

  const squareDiffs = scores.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / count;
  const stdDev = Math.sqrt(avgSquareDiff);

  // 計算級距人數
  scores.forEach(score => {
    if (score === 100) dist['100']++;
    else if (score >= 90) dist['90-99']++;
    else if (score >= 80) dist['80-89']++;
    else if (score >= 70) dist['70-79']++;
    else if (score >= 60) dist['60-69']++;
    else dist['<60']++;
  });

  return { avg, stdDev, q1, median, q3, minVal, maxVal, dist };
};

const parseFilenameInfo = (filename) => {
  let info = {};
  const yearMatch = filename.match(/(\d{2,3})(?:學年度|年)/);
  if (yearMatch) info.year = yearMatch[1];
  const termMatch = filename.match(/第?([12一二上下])學期/);
  if (termMatch) {
     let term = termMatch[1];
     if (term === '上' || term === '一') term = '1';
     if (term === '下' || term === '二') term = '2';
     info.term = term;
  }
  
  // 解析年級與班號 (例如：五年5班 -> grade:五, classNumber:5)
  const classMatch = filename.match(/([一二三四五六])年(\d+)班/);
  if (classMatch) {
      info.grade = classMatch[1];
      info.classNumber = classMatch[2];
  } else {
      // 容錯：嘗試解析數字年級 (例如 5年5班) 並轉為中文
      const numClassMatch = filename.match(/(\d)年(\d+)班/);
      if (numClassMatch) {
          const numMap = {'1':'一','2':'二','3':'三','4':'四','5':'五','6':'六'};
          info.grade = numMap[numClassMatch[1]] || numClassMatch[1];
          info.classNumber = numClassMatch[2];
      }
  }

  if (filename.includes('期中')) info.examType = '期中考';
  if (filename.includes('期末')) info.examType = '期末考';
  return info;
};

// --- 子組件：刻度尺 ---
const Ruler = ({ position }) => (
  <div className="relative w-full h-full flex items-center">
     <div className="relative w-full h-full text-black">
       {Array.from({ length: 11 }, (_, i) => i * 10).map(val => (
         <div key={val} className={`absolute flex flex-col items-center ${position === 'top' ? 'bottom-0' : 'top-0'}`} style={{ left: `${val}%`, transform: 'translateX(-50%)' }}>
            {position === 'top' && (
              <div className="flex flex-col items-center translate-y-1">
                <span className={`text-[9px] mb-0.5 font-sans font-black ${val === 60 ? 'text-black underline' : 'text-black'}`}>{val}</span>
                <div className="w-[1.5px] h-2 bg-black"></div>
              </div>
            )}
            {position === 'middle' && (
              <div className="flex flex-col items-center -translate-y-1 text-black">
                <div className="w-[1.5px] h-2 bg-black"></div>
                <span className={`text-[9px] mt-0.5 font-sans font-black ${val === 60 ? 'text-black underline' : 'text-black'}`}>{val}</span>
              </div>
            )}
         </div>
       ))}
     </div>
  </div>
);

// --- 子組件：箱型圖繪製 ---
const SubjectRowChart = ({ score, stat }) => {
  if (!stat) return <div className="h-full w-full"></div>;
  const scorePos = Math.min(100, Math.max(0, score));
  const avgPos = Math.min(100, Math.max(0, stat.avg));
  const q1Pos = Math.min(100, Math.max(0, stat.q1)); // 左
  const medianPos = Math.min(100, Math.max(0, stat.median));
  const q3Pos = Math.min(100, Math.max(0, stat.q3)); // 右
  const minPos = Math.min(100, Math.max(0, stat.minVal)); 
  const maxPos = Math.min(100, Math.max(0, stat.maxVal));
  
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

// --- 組件：箱型圖圖解說明 ---
const VisualRankExplanation = ({ showQrCode, showExplanation, uploadedQrCode }) => {
  if (!showQrCode && !showExplanation) return null;

  return (
    <div className="mt-1 flex items-stretch pt-2 border-t border-dashed border-black min-h-[150px] text-black">
      {showQrCode && (
        <div className={`flex flex-col items-center justify-center gap-1.5 pr-5 border-r border-gray-200 w-[140px] shrink-0 text-black`}>
            {/* QR Code 調整為 65% (約 94px) */}
            <div 
              className="bg-white border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-sm"
              style={{ width: '94px', height: '94px' }}
            >
                {uploadedQrCode ? (
                  <img src={uploadedQrCode} alt="QR" className="w-full h-full object-contain" />
                ) : (
                  <QrCode size={24} className="text-gray-200" />
                )}
            </div>
            <div className="text-center flex flex-col items-center">
                <span className="text-[9.5px] font-bold block leading-tight text-black">參考分析平台</span>
                <span className="text-[7.5px] font-bold block mt-1 leading-snug whitespace-nowrap text-black">
                  掃描QRCode查看詳細資訊
                </span>
                <span className="text-[7.5px] font-bold block leading-snug whitespace-nowrap text-black">
                  建議用外部瀏覽器開啟
                </span>
            </div>
        </div>
      )}

      {showExplanation && (
        <div className="flex-1 flex flex-col pl-5 overflow-hidden text-black">
            <div className="flex gap-5 mb-2 pb-1 border-b border-gray-100 w-full text-black">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-black">
                    <div className="w-2 h-2 bg-white rounded-full border border-black shadow-sm text-black"></div>
                    <span>我的分數</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-black">
                    <svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 2 L10 6 L6 10 L2 6 Z" fill="#f3f4f6" stroke="black" strokeWidth="1" /></svg>
                    <span>班平均</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-black">
                    <div className="w-4 h-2.5 bg-black relative flex justify-center items-center text-black">
                        <div className="w-[1px] h-2 bg-white"></div>
                    </div>
                    <span>「中間50%同學」的分數落點範圍</span>
                </div>
            </div>

            <div className="flex items-start gap-4 w-full text-black h-full">
                <div className="flex-1 flex flex-col">
                  <div className="text-[9px] font-bold mb-2 flex items-start gap-2 text-left text-black">
                    <BarChart3 size={12} className="shrink-0 mt-0.5 text-black" />
                    <span className="leading-relaxed text-black">
                      箱型圖區塊說明：全班依分數高低排序分為四等分（各25%），黑色箱子呈現班上中間程度區域，但不呈現班級最高、低分（極值）。
                    </span>
                  </div>
                  <div className="flex items-center justify-center relative pb-6 text-black">
                    <svg width="280" height="85" viewBox="0 0 320 85" className="overflow-visible text-black">
                      {/* 0-100 貫穿線 */}
                      <line x1="20" y1="40" x2="300" y2="40" stroke="#9ca3af" strokeWidth="1" />
                      
                      {/* 箱體 (Q1-Q3) */}
                      <rect x="90" y="28" width="140" height="24" fill="black" />
                      <line x1="160" y1="28" x2="160" y2="52" stroke="white" strokeWidth="1.5" />
                      
                      {/* 上方 25% 標示 */}
                      <text x="55" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">25%</text>
                      <text x="125" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">25%</text>
                      <text x="195" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">25%</text>
                      <text x="265" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748b">25%</text>
                      
                      {/* 下方標記 */}
                      <line x1="90" y1="52" x2="90" y2="58" stroke="black" strokeWidth="0.8" />
                      <text x="90" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="black">Q1</text>
                      
                      <line x1="160" y1="52" x2="160" y2="58" stroke="black" strokeWidth="0.8" />
                      <text x="160" y="68" textAnchor="middle" fontSize="10" fontWeight="bold" fill="black">中位數</text>
                      <text x="160" y="78" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#64748b">(分數排序中間者)</text>
                      
                      <line x1="230" y1="52" x2="230" y2="58" stroke="black" strokeWidth="0.8" />
                      <text x="230" y="68" textAnchor="middle" fontSize="9" fontWeight="bold" fill="black">Q3</text>
                    </svg>
                  </div>
                </div>

                <div className="w-[30%] flex flex-col gap-1.5 shrink-0 text-black border-l-2 border-black pl-4 py-1 bg-gray-50 h-full">
                  <div className="text-gray-400 text-[8px] mb-0.5 font-black uppercase tracking-widest text-black">附註</div>
                  <div className="flex flex-col gap-1 text-[8.5px] font-bold text-black">
                    <div>• Q3線往右側是「<u>前</u>25%」</div>
                    <div>• 中位數到Q3是「<u>前</u>25～50%」</div>
                    <div>• 中位數到Q1是「<u>後</u>50～25%」</div>
                    <div>• Q1線往左側是「<u>後</u>25%」</div>
                  </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- 組件：成績單主排版 (橫向 B5 尺寸) ---
const ReportCard = ({ data, stats, subjects, semesterInfo, examType, showChart, showGradeDistribution, showAverageInChart, showQrCode, showExplanation, uploadedQrCode, id }) => {
  if (!data) return null;
  const studentAvg = data.average !== undefined ? Number(data.average).toFixed(2) : '-';
  const rows = [...subjects, 'average'];
  const isFinalExam = examType === '期末考';

  return (
    <div 
      id={id} 
      className="report-card-element bg-white px-10 py-6 text-black relative shadow-lg flex flex-col transition-all overflow-hidden text-black"
      style={{ 
        width: '971px', // 257mm
        height: '688px', // 182mm
        pageBreakAfter: 'always',
        fontFamily: '"Times New Roman", "BiauKai", "DFKai-SB", serif' 
      }}
    >
      <h1 className="text-xl font-bold text-center mb-1 tracking-widest whitespace-nowrap text-black">
        {semesterInfo.schoolName}{semesterInfo.grade}年{semesterInfo.classNumber}班{semesterInfo.year}學年度第{semesterInfo.term}學期{examType}成績單
      </h1>

      <div className="flex justify-between items-end mb-2 px-1 text-black">
        <div className="flex gap-12 text-lg font-bold text-black">
           <span>姓名：{data['姓名']}</span>
           <span>座號：{data['座號']}</span>
        </div>
      </div>

      <div className="border-t-[2.5px] border-black flex flex-col flex-1 text-black">
        <div className="flex border-b-[2px] border-black text-black">
            {/* 基本資料區 (47%) */}
            <div className={`w-[47%] flex items-center h-[50px] shrink-0 text-black text-center`}>
                <div className="w-16 font-bold text-black text-lg">科目</div>
                <div className="w-12 font-bold text-black text-lg">分數</div>
                {isFinalExam && <div className="w-12 font-bold text-black text-base">進退步</div>}
                <div className="flex-1 flex justify-around items-center h-full text-black">
                    <div className="w-12 text-center text-sm font-bold h-full flex items-center justify-center border-l border-[#e5e7eb] bg-[#f9fafb] text-black">班平均</div>
                    {/* 級距標題 */}
                    {showGradeDistribution ? (
                         <>
                           <div className="flex-1 flex items-center justify-center border-l border-[#e5e7eb] bg-[#f9fafb] text-[8px] flex-col leading-none">100</div>
                           <div className="flex-1 flex items-center justify-center border-l border-[#e5e7eb] bg-[#f9fafb] text-[8px] flex-col leading-none">90<br/>|<br/>99</div>
                           <div className="flex-1 flex items-center justify-center border-l border-[#e5e7eb] bg-[#f9fafb] text-[8px] flex-col leading-none">80<br/>|<br/>89</div>
                           <div className="flex-1 flex items-center justify-center border-l border-[#e5e7eb] bg-[#f9fafb] text-[8px] flex-col leading-none">70<br/>|<br/>79</div>
                           <div className="flex-1 flex items-center justify-center border-l border-[#e5e7eb] bg-[#f9fafb] text-[8px] flex-col leading-none">60<br/>|<br/>69</div>
                           <div className="flex-1 flex items-center justify-center border-l border-[#e5e7eb] bg-[#f9fafb] text-[8px] flex-col leading-none">&lt;60</div>
                         </>
                    ) : null}
                </div>
            </div>

            {/* 箱型圖區 (38%) */}
            <div className="w-[38%] flex flex-col justify-end relative h-[50px] shrink-0 text-black border-l border-[#e5e7eb] px-2 pt-1">
                <div className="absolute top-0 left-4 font-bold text-black whitespace-nowrap">
                    <span className="text-lg">班級落點分析</span>
                    <span className="text-base font-normal ml-2">簡化版箱型圖</span>
                </div>
                <div className="h-4 w-full relative px-2 pr-2 text-black">
                    <Ruler position="top" />
                </div>
            </div>

            {/* 統計資料區 (15%) */}
            <div className="w-[15%] flex items-center justify-around text-[10px] font-bold border-l border-[#e5e7eb] bg-[#f9fafb]">
                <div className="flex-1 text-center h-full flex items-center justify-center">Q1</div>
                <div className="flex-1 text-center border-l border-[#e5e7eb] h-full flex items-center justify-center">中位數</div>
                <div className="flex-1 text-center border-l border-[#e5e7eb] h-full flex items-center justify-center">Q3</div>
            </div>
        </div>

        {/* 內容列 */}
        <div className="flex flex-col flex-1 text-black">
            {rows.map((subject, idx) => {
                const isAvgRow = subject === 'average';
                const label = isAvgRow ? (
                    <div className="flex flex-col leading-none">
                        <span>個人</span>
                        <span>平均</span>
                    </div>
                ) : subject;
                const score = isAvgRow ? studentAvg : (data[subject] ?? '');
                const stat = stats[subject];
                const chartScore = isAvgRow ? Number(studentAvg) : Number(data[subject]);
                const rowClass = idx % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]';
                const borderClass = isAvgRow ? 'border-t-2 border-black font-bold mt-auto' : 'border-b border-[#f3f4f6]';

                // 決定是否顯示統計數據 (對個人平均列：只有 showAverageInChart 開啟才顯示)
                const showStats = !isAvgRow || showAverageInChart;

                return (
                    <div key={subject} className={`flex ${rowClass} ${borderClass} h-11 transition-all text-black text-center items-center`}>
                        {/* 基本資料區 */}
                        <div className={`w-[47%] flex items-center shrink-0 text-black h-full`}>
                            <div className="w-16 font-bold text-lg text-black flex justify-center">{label}</div>
                            <div className="w-12 font-bold text-lg text-black">{score}</div>
                            {isFinalExam && <div className="w-12 text-sm font-bold text-black">{!isAvgRow ? (data[`${subject}進退步`] || '—') : (data['平均進退步'] || '—')}</div>}
                            <div className="flex-1 flex justify-around text-black h-full items-center">
                                <div className="w-12 text-base border-l border-[#f3f4f6] text-black font-bold h-full flex items-center justify-center">{stat?.avg?.toFixed(1) || '—'}</div>
                                {/* 級距數值 - 0 顯示 "0" (個人平均列也顯示) */}
                                {showGradeDistribution && stat?.dist && (
                                    <>
                                        <div className="flex-1 text-xs border-l border-[#f3f4f6] h-full flex items-center justify-center">{stat.dist['100']}</div>
                                        <div className="flex-1 text-xs border-l border-[#f3f4f6] h-full flex items-center justify-center">{stat.dist['90-99']}</div>
                                        <div className="flex-1 text-xs border-l border-[#f3f4f6] h-full flex items-center justify-center">{stat.dist['80-89']}</div>
                                        <div className="flex-1 text-xs border-l border-[#f3f4f6] h-full flex items-center justify-center">{stat.dist['70-79']}</div>
                                        <div className="flex-1 text-xs border-l border-[#f3f4f6] h-full flex items-center justify-center">{stat.dist['60-69']}</div>
                                        <div className="flex-1 text-xs border-l border-[#f3f4f6] h-full flex items-center justify-center">{stat.dist['<60']}</div>
                                    </>
                                )}
                                {!showGradeDistribution && <div className="flex-1"></div>}
                            </div>
                        </div>

                        {/* 箱型圖區 */}
                        <div className="w-[38%] flex relative border-l border-[#e5e7eb] text-black h-full px-2">
                            {showChart && (
                                <>
                                    {isAvgRow && (
                                        <div className="absolute top-0 left-0 right-0 h-4 z-40 pl-2 pr-2 pointer-events-none text-black" style={{ transform: 'translateY(-50%)' }}>
                                            <Ruler position="middle" />
                                        </div>
                                    )}
                                    {/* 針對個人平均列 (isAvgRow=true)，加入 translateY(10px) 將箱型圖下移 */}
                                    <div 
                                        className="flex items-center h-full w-full px-2"
                                        style={isAvgRow ? { transform: 'translateY(10px)' } : {}}
                                    >
                                        {/* 個人平均列是否顯示箱型圖，取決於 showAverageInChart */}
                                        {showStats ? <SubjectRowChart score={chartScore} stat={stat} /> : null}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 統計資料區 (Q1/中/Q3) */}
                        <div className="w-[15%] flex items-center justify-around text-sm font-bold border-l border-[#e5e7eb] h-full">
                            <div className="flex-1 text-center h-full flex items-center justify-center">{showStats ? stat?.q1 : '—'}</div>
                            <div className="flex-1 text-center border-l border-[#f3f4f6] h-full flex items-center justify-center">{showStats ? stat?.median : '—'}</div>
                            <div className="flex-1 text-center border-l border-[#f3f4f6] h-full flex items-center justify-center">{showStats ? stat?.q3 : '—'}</div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      <div className="mt-1 pt-1 text-black">
        <VisualRankExplanation 
            showQrCode={showQrCode} 
            showExplanation={showExplanation} 
            uploadedQrCode={uploadedQrCode} 
        />
        <div className="mt-2 flex border-t-[2.5px] border-black pt-2 text-left text-black">
          <div className="w-1/3 pr-8 border-r-2 border-dashed border-black flex flex-col justify-between text-black">
            <div className="text-lg font-bold mb-6 text-black">家長簽名：</div>
            <div className="border-b border-black w-full h-1 text-black"></div>
          </div>
          <div className="w-2/3 pl-8 text-black">
            <div className="text-lg font-bold mb-1 text-black">給孩子或老師的回饋：</div>
            <div className="h-16 text-black"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 組件：科目對應彈窗 ---
const SubjectMappingModal = ({ isOpen, onClose, detectedColumns, onConfirm }) => {
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [mappings, setMappings] = useState({});
  useEffect(() => {
    if (isOpen) {
      setSelectedSubjects(detectedColumns);
      const initialMappings = {};
      detectedColumns.forEach(col => { initialMappings[col] = col; });
      setMappings(initialMappings);
    }
  }, [isOpen, detectedColumns]);
  const handleConfirm = () => onConfirm(selectedSubjects, mappings);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 text-black text-left">
      <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-2xl text-black">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-700 font-black">
          <List className="text-blue-600" /> 請勾選成績科目
        </h3>
        <div className="grid grid-cols-1 gap-3 mb-8 max-h-[50vh] overflow-y-auto pr-2 text-black">
          {detectedColumns.map(col => (
            <div key={col} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${selectedSubjects.includes(col) ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <input type="checkbox" checked={selectedSubjects.includes(col)} onChange={() => setSelectedSubjects(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])} className="w-5 h-5 accent-blue-600 cursor-pointer text-black" />
              <div className="flex-1 text-black">
                <input 
                    type="text" 
                    value={mappings[col] || ''} 
                    onChange={(e) => setMappings({...mappings, [col]: e.target.value})} 
                    className={`flex-1 border p-2 rounded-lg text-sm font-bold w-full text-black ${selectedSubjects.includes(col) ? 'text-black border-blue-400 bg-white' : 'text-gray-400 bg-gray-100'}`}
                    disabled={!selectedSubjects.includes(col)} 
                  />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t font-bold text-black">
          <button onClick={onClose} className="px-6 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-black">取消</button>
          <button onClick={handleConfirm} className="px-10 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-transform active:scale-95 text-black">產生成績單</button>
        </div>
      </div>
    </div>
  );
};

// --- 主組件：App ---
export default function App() {
  const [students, setStudents] = useState([]);
  const [classStats, setClassStats] = useState({});
  const [subjects, setSubjects] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [examType, setExamType] = useState('期末考');
  const [uploadedQrCode, setUploadedQrCode] = useState(null); 
  const [showChart, setShowChart] = useState(true);
  const [showAverageInChart, setShowAverageInChart] = useState(false); 
  const [showQrCode, setShowQrCode] = useState(true); 
  const [showExplanation, setShowExplanation] = useState(true); 
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [showGradeDistribution, setShowGradeDistribution] = useState(true);
  const [rawFileData, setRawFileData] = useState([]);
  const [detectedRawColumns, setDetectedRawColumns] = useState([]);
  const [semesterInfo, setSemesterInfo] = useState({ 
    schoolName: '麗園國小', 
    grade: '五', 
    classNumber: '5', 
    year: '114', 
    term: '1' 
  });
  const [previewZoom, setPreviewZoom] = useState(100);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!showChart) {
      setShowAverageInChart(false);
      setShowExplanation(false);
      setShowQrCode(false);
      setShowGradeDistribution(false);
    }
  }, [showChart]);

  useEffect(() => {
    setLibsLoaded(true);
    const mockData = [{ '座號': '99', '姓名': '馬斯克', '國語': 50, '數學': 50, '社會': 50, '英文': 50, '自然': 50 }];
    processData(mockData, ['國語', '數學', '社會', '英文', '自然']);
  }, []);

  const processData = (data, currentSubjects, mapping = null) => {
    const processedData = data.map(student => {
      let newStudent = { ...student };
      if (mapping) {
        Object.keys(mapping).forEach(oldKey => { 
          const newKey = mapping[oldKey];
          if (newKey !== oldKey) {
            newStudent[newKey] = student[oldKey];
            const oldProgress = `${oldKey}進退步`;
            const newProgress = `${newKey}進退步`;
            if (student[oldProgress] !== undefined) {
              newStudent[newProgress] = student[oldProgress];
            }
          }
        });
      }
      let total = 0, count = 0;
      currentSubjects.forEach(s => { if (newStudent[s] !== undefined && newStudent[s] !== '') { total += Number(newStudent[s]); count++; } });
      return { ...newStudent, average: count > 0 ? (total / count) : undefined }; 
    });
    const stats = {};
    [...currentSubjects, 'average'].forEach(k => { stats[k] = calculateStats(processedData, k); });
    setClassStats(stats); 
    setStudents(processedData); 
    setSubjects(currentSubjects);
    setCurrentIndex(0);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (data.length > 0) {
          setRawFileData(data); 
          setDetectedRawColumns(Object.keys(data[0]).filter(k => !['姓名','座號','平均','總分'].includes(k) && !k.includes('進退步')));
          const info = parseFilenameInfo(file.name);
          setSemesterInfo(prev => ({ ...prev, ...info }));
          if (info.examType) setExamType(info.examType);
          setIsMappingOpen(true);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setUploadedQrCode(evt.target.result);
      reader.readAsDataURL(file);
    }
  };

  const generateCanvasImage = async (elId) => {
    const element = document.getElementById(elId); 
    if (!element) return null;

    try {
      const dataUrl = await toJpeg(element, { 
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        style: {
          transform: 'none',
          margin: '0',
          boxShadow: 'none'
        }
      });
      return dataUrl;
    } catch (err) {
      console.error("生成圖片失敗:", err);
      throw new Error("無法生成成績單影像，請重新整理網頁再試！");
    }
  };

  const downloadSinglePDF = async () => {
    setIsProcessing(true);
    try {
      const imgData = await generateCanvasImage('single-report-card');
      const pdf = new jsPDF('l', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 257, 182); 
      const name = students[currentIndex]['姓名'];
      pdf.save(`${semesterInfo.year}學年_${semesterInfo.grade}年${semesterInfo.classNumber}班_${examType}_${name}.pdf`);
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  const downloadMergedPDF = async () => {
    if (students.length <= 1 && students[0]['姓名'] === '馬斯克') return;
    setIsProcessing(true);
    setDownloadProgress({ current: 0, total: students.length });
    
    try {
      let pdf;
      for (let i = 0; i < students.length; i++) {
        setDownloadProgress(prev => ({ ...prev, current: i + 1 }));
        setCurrentIndex(i);
        await new Promise(resolve => setTimeout(resolve, 800)); 
        const imgData = await generateCanvasImage('single-report-card');
        if (i === 0) {
          pdf = new jsPDF('l', 'mm', 'a4');
        } else {
          pdf.addPage('a4', 'l');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 257, 182);
      }
      
      const filename = `${semesterInfo.year}學年_${semesterInfo.grade}年${semesterInfo.classNumber}班_${examType}_全班成績單.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  if (!libsLoaded) return <div className="h-screen flex items-center justify-center text-blue-600 font-bold bg-white text-black"><Loader2 className="animate-spin mr-3"/>載入工具中...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-black overflow-hidden">
      <div className="fixed top-0 left-0 w-full bg-blue-700 text-white text-[10px] py-1 px-4 z-[60] flex items-center justify-center shadow-md font-bold print:hidden uppercase tracking-widest text-black">
         <ShieldCheck size={12} className="mr-2"/> Secure Local Processing - B5 Design Standard
      </div>

      <div className="w-full md:w-80 bg-white shadow-2xl p-6 flex flex-col gap-6 z-10 md:h-screen md:overflow-y-auto print:hidden pt-10 border-r border-gray-200 text-left text-black">
        <div className="border-b pb-4 mt-2 text-black">
          <h2 className="text-2xl font-black flex items-center gap-2 text-blue-800 uppercase"><FileUp size={28} />成績單產生器</h2>
          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter text-black">Professional B5 Report System</p>
        </div>
        
        <div className="space-y-5 text-left text-black font-black">
          <section className="space-y-3 text-black">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 text-black"><BookOpen size={14}/> 1. 基本資訊</h3>
            <div className="space-y-2 text-black">
              <input type="text" value={semesterInfo.schoolName} onChange={e => setSemesterInfo({...semesterInfo, schoolName: e.target.value})} className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 font-bold text-black focus:ring-1 focus:ring-blue-500 outline-none transition-all text-black" placeholder="學校名稱" />
              
              <div className="flex gap-2 items-center text-black">
                <select 
                  value={semesterInfo.grade} 
                  onChange={e => setSemesterInfo({...semesterInfo, grade: e.target.value})} 
                  className="w-1/2 border p-2.5 rounded-lg text-sm bg-gray-50 font-bold text-black focus:ring-1 focus:ring-blue-500 outline-none text-black"
                >
                  <option value="一">一年級</option>
                  <option value="二">二年級</option>
                  <option value="三">三年級</option>
                  <option value="四">四年級</option>
                  <option value="五">五年級</option>
                  <option value="六">六年級</option>
                </select>
                <div className="w-1/2 flex items-center gap-1 border p-2.5 rounded-lg bg-gray-50 text-black">
                  <input 
                    type="text" 
                    value={semesterInfo.classNumber} 
                    onChange={e => setSemesterInfo({...semesterInfo, classNumber: e.target.value})} 
                    className="w-full bg-transparent text-sm font-bold text-black focus:outline-none text-right" 
                    placeholder="班號" 
                  />
                  <span className="text-sm font-bold text-black">班</span>
                </div>
              </div>

              <div className="flex gap-2 text-black">
                <input type="text" value={semesterInfo.year} onChange={e => setSemesterInfo({...semesterInfo, year: e.target.value})} className="w-1/2 border p-2.5 rounded-lg text-sm bg-gray-50 font-bold text-black focus:ring-1 focus:ring-blue-500 outline-none text-black" placeholder="學年" />
                <select value={semesterInfo.term} onChange={e => setSemesterInfo({...semesterInfo, term: e.target.value})} className="w-1/2 border p-2.5 rounded-lg text-sm bg-gray-50 font-bold text-black focus:ring-1 focus:ring-blue-500 outline-none text-black">
                  <option value="1">第 1 學期</option><option value="2">第 2 學期</option>
                </select>
              </div>
              <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm bg-blue-600 text-white font-bold cursor-pointer transition-colors hover:bg-blue-700 text-black">
                <option value="期中考">期中考</option>
                <option value="期末考">期末考</option>
              </select>
            </div>
          </section>

          <section className="space-y-3 text-black">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 text-black"><Upload size={14}/> 2. 上傳資料</h3>
            <div className="border-2 border-dashed border-blue-100 p-6 rounded-xl text-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 relative group transition-all text-black">
              <FileUp className="mx-auto text-blue-300 mb-2 group-hover:scale-110 transition-transform text-black" size={32} />
              <span className="text-xs text-blue-600 font-black block uppercase text-black">Import Excel</span>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer text-black" accept=".xlsx,.xls" onChange={handleFileUpload} />
            </div>
          </section>

          <section className="space-y-3 text-black">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 text-black"><Layers size={14}/> 3. 顯示設定</h3>
            <div className="flex flex-col gap-3 p-4 rounded-xl border bg-gray-50 text-xs">
              <label className="flex items-center gap-3 cursor-pointer group text-black">
                <input type="checkbox" checked={showChart} onChange={e => setShowChart(e.target.checked)} className="w-4 h-4 accent-blue-600 text-black" />
                <span className="font-black group-hover:text-blue-600 text-black">顯示落點箱型圖</span>
              </label>

              {showChart && (
                <div className="ml-6 flex flex-col gap-3 border-l-2 border-blue-200 pl-4 py-1 animate-in slide-in-from-top-2 duration-200 text-black">
                  <label className="flex items-center gap-3 cursor-pointer group font-bold text-black">
                    <input type="checkbox" checked={showGradeDistribution} onChange={e => setShowGradeDistribution(e.target.checked)} className="w-4 h-4 accent-blue-600 text-black" />
                    <span className="group-hover:text-blue-600 text-[10px] text-black">顯示級距人數</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group font-bold text-black">
                    <input type="checkbox" checked={showAverageInChart} onChange={e => setShowAverageInChart(e.target.checked)} className="w-4 h-4 accent-blue-600 text-black" />
                    <span className="group-hover:text-blue-600 text-[10px] text-black">圖表包含個人平均</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group font-bold text-black">
                    <input type="checkbox" checked={showExplanation} onChange={e => setShowExplanation(e.target.checked)} className="w-4 h-4 accent-blue-600 text-black" />
                    <span className="group-hover:text-blue-600 text-[10px] text-black">顯示圖解說明區</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group font-bold text-black">
                    <input type="checkbox" checked={showQrCode} onChange={e => setShowQrCode(e.target.checked)} className="w-4 h-4 accent-blue-600 text-black" />
                    <span className="group-hover:text-blue-600 text-[10px] text-black">顯示 QR Code</span>
                  </label>
                  
                  {showQrCode && (
                    <div className="mt-2 flex flex-col gap-2">
                      <div className="border-2 border-dashed border-blue-100 p-3 rounded-lg bg-white relative hover:border-blue-500 transition-colors text-black text-center group cursor-pointer">
                        {uploadedQrCode ? (
                          <div className="relative">
                            <img src={uploadedQrCode} alt="QR" className="h-16 w-16 mx-auto object-contain text-black" />
                            <div className="absolute inset-0 bg-blue-900/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded text-black">
                               <span className="text-[10px] text-white font-bold uppercase tracking-widest">Change</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-blue-300 text-black">
                             <QrCode size={20} />
                             <span className="text-[9px] mt-1 font-bold text-black">Upload Image</span>
                          </div>
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer text-black" accept="image/*" onChange={handleQrUpload} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {students.length > 0 && (
          <div className="mt-auto space-y-4 pt-4 border-t text-black">
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100 text-black">
              <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0 || isProcessing} className="disabled:opacity-20 p-1 hover:bg-white rounded-lg transition-colors text-blue-600 text-black"><ChevronLeft size={24}/></button>
              <div className="text-center font-black">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest font-black text-black">Previewing</p>
                <span className="font-black text-blue-900 text-black">{students[currentIndex]['姓名']}</span>
              </div>
              <button onClick={() => setCurrentIndex(Math.min(students.length - 1, currentIndex + 1))} disabled={currentIndex === students.length - 1 || isProcessing} className="disabled:opacity-20 p-1 hover:bg-white rounded-lg transition-colors text-blue-600 text-black"><ChevronRight size={24}/></button>
            </div>
            
            <div className="grid grid-cols-1 gap-2 text-black">
              <button onClick={downloadSinglePDF} disabled={isProcessing} className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-xl flex items-center justify-center gap-2 font-black hover:bg-blue-50 transition-all shadow-sm uppercase text-[12px]">
                {isProcessing && downloadProgress.total === 0 ? <Loader2 className="animate-spin text-black" size={16}/> : <Download size={16}/>}
                下載目前頁面
              </button>
              <button onClick={downloadMergedPDF} disabled={isProcessing} className="w-full bg-blue-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-200 uppercase text-[12px]">
                {isProcessing && downloadProgress.total > 0 ? <Loader2 className="animate-spin text-black" size={18}/> : <Layers3 size={18}/>}
                合併下載全班
              </button>
            </div>

            {isProcessing && downloadProgress.total > 0 && (
               <div className="space-y-1 mt-2 text-black">
                  <div className="flex justify-between text-[10px] font-bold text-blue-600 text-black">
                    <span>PDF 合併中...</span>
                    <span>{downloadProgress.current} / {downloadProgress.total}</span>
                  </div>
                  <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden text-black">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300 text-black" 
                      style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                    />
                  </div>
               </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 bg-gray-500 overflow-auto relative scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-600 p-8 text-black">
        <div className="sticky top-6 left-0 right-0 mx-auto z-[70] bg-white/95 border border-blue-100 shadow-2xl rounded-full px-6 py-2 flex items-center gap-6 w-max text-black backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-400 text-black">
               <Search size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest text-black">Preview Scale</span>
            </div>
            <div className="h-4 w-px bg-gray-200 text-black"></div>
            <div className="flex items-center gap-4 text-black">
               <button onClick={() => setPreviewZoom(Math.max(20, previewZoom - 10))} className="p-1.5 hover:bg-blue-50 rounded-full text-blue-600 transition-colors text-black"><ZoomOut size={18}/></button>
               <input 
                  type="range" min="20" max="150" step="5" value={previewZoom} 
                  onChange={(e) => setPreviewZoom(Number(e.target.value))} 
                  className="w-40 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 text-black" 
               />
               <button onClick={() => setPreviewZoom(Math.min(150, previewZoom + 10))} className="p-1.5 hover:bg-blue-50 rounded-full text-blue-600 transition-colors text-black"><ZoomIn size={18}/></button>
            </div>
            <div className="h-4 w-px bg-gray-200 text-black"></div>
            <span className="text-[10px] font-black text-blue-600 w-10 text-center text-black">{previewZoom}%</span>
            <button onClick={() => setPreviewZoom(100)} className="text-[10px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 shadow-md active:scale-95 uppercase tracking-tighter text-black">Reset 100%</button>
        </div>

        <div className="mt-12 flex justify-center min-w-max pb-20 text-black">
            <div 
              className="transition-transform duration-300 ease-out origin-top flex-shrink-0 text-black" 
              style={{ transform: `scale(${previewZoom / 100})` }}
            >
              <ReportCard 
                  id="single-report-card" 
                  data={students[currentIndex]} 
                  stats={classStats} 
                  subjects={subjects} 
                  semesterInfo={semesterInfo} 
                  examType={examType} 
                  showChart={showChart} 
                  showAverageInChart={showAverageInChart} 
                  showGradeDistribution={showGradeDistribution}
                  showQrCode={showQrCode} 
                  showExplanation={showExplanation} 
                  uploadedQrCode={uploadedQrCode} 
              />
            </div>
        </div>
      </div>
      
      {/* 渲染 Modal 組件 */}
      <SubjectMappingModal isOpen={isMappingOpen} onClose={() => setIsMappingOpen(false)} detectedColumns={detectedRawColumns} onConfirm={(sel, map) => { processData(rawFileData, sel, map); setIsMappingOpen(false); }} />
    </div>
  );
}
