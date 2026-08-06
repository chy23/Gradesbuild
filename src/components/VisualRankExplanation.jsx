import React from 'react';
import { QrCode, BarChart3 } from 'lucide-react';

export const VisualRankExplanation = ({ showQrCode, showExplanation, uploadedQrCode }) => {
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
