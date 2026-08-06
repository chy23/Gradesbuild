import React from 'react';
import { SubjectRowChart } from './SubjectRowChart';
import { VisualRankExplanation } from './VisualRankExplanation';

export const ReportCard = ({ 
  student, 
  stats, 
  semesterInfo, 
  examType, 
  showRank, 
  showExtremes, 
  showChart, 
  showQrCode, 
  showExplanation, 
  uploadedQrCode,
  isHighlightEnabled = true
}) => {
  const subjects = Object.keys(stats).filter(subj => stats[subj]);
  
  // 計算總分與平均 (僅計算有效科目)
  let validTotal = 0;
  let validSubjectCount = 0;
  subjects.forEach(subj => {
    const val = student[subj];
    if (val !== undefined && val !== null && val !== '') {
      validTotal += Number(val);
      validSubjectCount++;
    }
  });
  const avgScore = validSubjectCount > 0 ? (validTotal / validSubjectCount).toFixed(1) : 0;

  // 取得評語 (如果有)
  let comment = '';
  const commentKeys = Object.keys(student).filter(k => k.includes('評語') || k.includes('建議'));
  if (commentKeys.length > 0) comment = student[commentKeys[0]];

  return (
    <div className="w-[971px] h-[688px] bg-white text-black p-10 flex flex-col mx-auto relative border border-gray-100 shadow-sm print:shadow-none print:border-none print:w-[100%] print:h-[100%] print:p-0">
      
      {/* 水印 - 只在網頁顯示，列印時隱藏 */}
      <div 
        className="absolute top-16 right-8 text-gray-600 font-bold pointer-events-none z-50 select-none tracking-widest print:hidden"
        style={{ fontSize: '18pt', opacity: 0.25 }}
      >
        網站建立自楊家驊老師
      </div>
      <div 
        className="absolute bottom-12 right-8 text-gray-600 font-bold pointer-events-none z-50 select-none tracking-widest print:hidden"
        style={{ fontSize: '18pt', opacity: 0.25 }}
      >
        網站建立自楊家驊老師
      </div>

      <div className="flex justify-between items-end mb-6 pb-4 border-b-2 border-black px-2 relative">
        <div>
           <h2 className="text-3xl font-black mb-3 tracking-widest text-black">
             {semesterInfo.schoolName || ''}{semesterInfo.year}學年度第{semesterInfo.term}學期{semesterInfo.grade ? `${semesterInfo.grade}年級` : ''}{examType || '成績單'}
           </h2>
           <div className="text-xl font-bold tracking-widest text-black flex items-center gap-6">
              <span>班級：{semesterInfo.grade || ''}年 {semesterInfo.classNumber || ''}班</span>
              <span>座號：{student['座號'] || ''}</span>
              <span className="text-2xl ml-4">姓名：<span className="tracking-widest">{student['姓名'] || ''}</span></span>
           </div>
        </div>
        <div className="text-right">
           <div className="text-[15px] font-bold mb-1 text-black">總分：<span className="text-2xl">{validTotal}</span></div>
           <div className="text-[15px] font-bold text-black">平均：<span className="text-2xl">{avgScore}</span></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start">
        <table className="w-full border-collapse border-2 border-black text-center text-sm font-bold table-fixed text-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-2 w-[10%] tracking-widest whitespace-nowrap text-black">領域</th>
              <th className="border border-black p-2 w-[7%] tracking-widest whitespace-nowrap text-black">分數</th>
              {showRank && <th className="border border-black p-2 w-[8%] tracking-widest whitespace-nowrap text-black">班平均</th>}
              <th className="border border-black p-2 w-[8%] tracking-widest whitespace-nowrap text-black relative">
                進退步
                <div className="absolute -bottom-4 left-0 w-full text-center text-[10px] text-gray-500 font-normal scale-75 hidden">預留</div>
              </th>
              {showChart && <th className="border border-black p-2 w-[67%] tracking-widest text-black">班級落點分析圖</th>}
            </tr>
          </thead>
          <tbody>
            {subjects.map(subj => {
              const stat = stats[subj];
              if (!stat) return null;
              
              let score = student[subj];
              let hasScore = score !== undefined && score !== null && score !== '';
              let scoreNum = hasScore ? Number(score) : null;
              
              // 動態找尋進退步欄位
              let diffValue = '';
              let diffKey = Object.keys(student).find(k => k.includes(subj) && k.includes('進退步'));
              if (!diffKey) {
                // 如果沒有精確匹配，找任何包含「進退步」的欄位中順序對應的
                const allDiffs = Object.keys(student).filter(k => k.includes('進退步'));
                const subjIndex = subjects.indexOf(subj);
                if (subjIndex >= 0 && subjIndex < allDiffs.length) {
                   diffValue = student[allDiffs[subjIndex]];
                }
              } else {
                 diffValue = student[diffKey];
              }

              // 紅色高亮邏輯
              // 如果分數不及格 (<60) 或者 退步 >= 10 分
              const diffNum = (diffValue !== undefined && diffValue !== null && diffValue !== '') ? Number(diffValue) : null;
              const isFailing = isHighlightEnabled && hasScore && scoreNum < 60;
              const isSignificantDrop = isHighlightEnabled && diffNum !== null && diffNum <= -10;

              return (
                <tr key={subj}>
                  <td className="border border-black p-2 text-base tracking-widest whitespace-nowrap text-black">{subj}</td>
                  <td className={`border border-black p-2 text-[17px] font-black ${isFailing ? 'text-red-600' : 'text-black'}`}>
                    {hasScore ? score : ''}
                  </td>
                  {showRank && (
                    <td className="border border-black p-2 text-[15px] font-bold text-black">
                      {stat.avg.toFixed(1)}
                    </td>
                  )}
                  <td className={`border border-black p-2 text-[15px] font-bold ${isSignificantDrop ? 'text-red-600' : 'text-black'}`}>
                    {diffValue !== undefined && diffValue !== null ? diffValue : ''}
                  </td>
                  {showChart && (
                    <td className="border border-black p-0 h-[48px] bg-white relative overflow-visible text-black align-middle">
                      {hasScore && (
                        <div className="absolute inset-0 h-full w-full pointer-events-none" style={{ transform: 'translateY(-1px)' }}>
                          <SubjectRowChart score={score} stat={stat} />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {comment && (
          <div className="mt-3 p-3 border-2 border-black bg-gray-50 text-black">
             <div className="font-bold mb-1 tracking-widest text-black">教師評語：</div>
             <div className="text-sm font-bold text-black">{comment}</div>
          </div>
        )}

        <VisualRankExplanation 
          showQrCode={showQrCode} 
          showExplanation={showExplanation} 
          uploadedQrCode={uploadedQrCode} 
        />
      </div>

      <div className="mt-auto pt-2 flex justify-between items-end font-bold text-lg text-black px-2 pb-1">
        <div>家長簽章：</div>
        <div>導師簽章：</div>
      </div>
    </div>
  );
};
