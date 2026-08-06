/**
 * 網站建立自楊家驊老師 The website was created by Teacher ChiahuaYang
 * 授權與版權所有
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileUp, Download, Printer, Users, ChevronLeft, ChevronRight, 
  AlertCircle, Loader2, FileDown, ShieldCheck, QrCode, Image as ImageIcon,
  ZoomIn, ZoomOut, Search, Maximize2, Menu, X
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Toaster, toast } from 'react-hot-toast';

// Custom Hooks & Utils
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateStats } from './utils/math';
import { parseInfoFromString } from './utils/parser';

// Components
import { SubjectMappingModal } from './components/SubjectMappingModal';
import { ReportCard } from './components/ReportCard';

export default function App() {
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [rawFileData, setRawFileData] = useState(null);
  const [detectedRawColumns, setDetectedRawColumns] = useState([]);
  
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectStats, setSubjectStats] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [zoom, setZoom] = useState(1);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // User Preferences (LocalStorage)
  const [semesterInfo, setSemesterInfo] = useLocalStorage('gradesbuild_semesterInfo', {
    schoolName: '', year: '', term: '', grade: '', classNumber: ''
  });
  const [examType, setExamType] = useLocalStorage('gradesbuild_examType', '期中考');
  const [showRank, setShowRank] = useLocalStorage('gradesbuild_showRank', true);
  const [showExtremes, setShowExtremes] = useLocalStorage('gradesbuild_showExtremes', false);
  const [showChart, setShowChart] = useLocalStorage('gradesbuild_showChart', true);
  const [showQrCode, setShowQrCode] = useLocalStorage('gradesbuild_showQrCode', true);
  const [showExplanation, setShowExplanation] = useLocalStorage('gradesbuild_showExplanation', true);
  const [isHighlightEnabled, setIsHighlightEnabled] = useLocalStorage('gradesbuild_isHighlightEnabled', true);
  const [uploadedQrCode, setUploadedQrCode] = useLocalStorage('gradesbuild_uploadedQrCode', null);

  useEffect(() => {
    setLibsLoaded(true);
    // 預設資料
    const mockData = [{ '座號': '99', '姓名': '馬斯克', '國語': 50, '數學': 50, '社會': 50, '英文': 50, '自然': 50 }];
    processData(mockData, ['國語', '數學', '社會', '英文', '自然']);
  }, []);

  const processData = (data, currentSubjects, mapping = null) => {
    let processedData = data.map(row => {
      let newRow = { ...row };
      if (mapping) {
        Object.keys(mapping).forEach(oldKey => {
          if (oldKey !== mapping[oldKey] && newRow[oldKey] !== undefined) {
            newRow[mapping[oldKey]] = newRow[oldKey];
            delete newRow[oldKey];
          }
        });
      }
      return newRow;
    });

    const stats = {};
    currentSubjects.forEach(subj => {
      stats[subj] = calculateStats(processedData, subj);
    });

    processedData.sort((a, b) => {
      const aNum = parseInt(a['座號']) || 0;
      const bNum = parseInt(b['座號']) || 0;
      return aNum - bNum;
    });

    setStudents(processedData);
    setSubjects(currentSubjects);
    setSubjectStats(stats);
    setCurrentIndex(0);
    toast.success(`成功匯入 ${processedData.length} 筆資料`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if (data.length > 0) {
            setRawFileData(data); 
            setDetectedRawColumns(Object.keys(data[0]).filter(k => !['姓名','座號','平均','總分'].includes(k) && !k.includes('進退步')));
            
            const infoFromSheet = parseInfoFromString(wb.SheetNames[0]);
            const infoFromFile = parseInfoFromString(file.name);
            const combinedInfo = { ...infoFromSheet, ...infoFromFile };
            
            setSemesterInfo(prev => ({ ...prev, ...combinedInfo }));
            if (combinedInfo.examType) setExamType(combinedInfo.examType);
            setIsMappingOpen(true);
          }
        } catch (err) {
          toast.error("讀取 Excel 失敗");
          console.error(err);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleMappingConfirm = (selectedColumns, mapping) => {
    const newSubjects = selectedColumns.map(col => mapping[col]);
    processData(rawFileData, newSubjects, mapping);
    setIsMappingOpen(false);
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setUploadedQrCode(evt.target.result);
        toast.success("QR Code 更新成功");
      };
      reader.readAsDataURL(file);
    }
  };

  const generateCanvasImage = async (elId) => {
    const element = document.getElementById(elId); 
    if (!element) return null;
    
    return await htmlToImage.toJpeg(element, { 
      pixelRatio: 3,
      width: 971,
      height: 688,
      backgroundColor: '#ffffff',
      style: { transform: 'none', margin: '0' }
    });
  };

  const downloadSinglePDF = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('正在產生單筆 PDF...');
    try {
      const imgData = await generateCanvasImage('single-report-card');
      const pdf = new jsPDF('l', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 257, 182); 
      const name = students[currentIndex]['姓名'];
      pdf.save(`${semesterInfo.year}學年_${semesterInfo.grade}年${semesterInfo.classNumber}班_${examType}_${name}.pdf`);
      toast.success('下載成功', { id: toastId });
    } catch (err) { 
      toast.error('產生失敗', { id: toastId });
      console.error(err); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const downloadMergedPDF = async () => {
    if (students.length === 0) return;
    setIsProcessing(true);
    setDownloadProgress({ current: 0, total: students.length });
    const toastId = toast.loading('開始批次處理全班成績單...');
    
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      for (let i = 0; i < students.length; i++) {
        setDownloadProgress(prev => ({ ...prev, current: i + 1 }));
        
        // 渲染對應學生的成績單
        setCurrentIndex(i);
        
        // 強制讓瀏覽器有時間更新畫面與釋放記憶體
        await new Promise(resolve => setTimeout(resolve, 50));
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const imgData = await generateCanvasImage('single-report-card');
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 257, 182);
      }
      
      pdf.save(`${semesterInfo.year}學年_${semesterInfo.grade}年${semesterInfo.classNumber}班_${examType}_全班成績單.pdf`);
      toast.success('全班成績單下載完成！', { id: toastId });
    } catch (err) {
      toast.error('合併下載失敗', { id: toastId });
      console.error(err);
    } finally {
      setIsProcessing(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  // 原生列印功能
  const handlePrint = () => {
    window.print();
  };

  if (!libsLoaded) return <div className="h-screen flex items-center justify-center text-blue-600 font-bold bg-white text-black"><Loader2 className="animate-spin mr-3"/>載入工具中...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-black overflow-hidden relative">
      <Toaster position="top-right" />
      
      {/* 行動版漢堡選單按鈕 */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-3 left-3 z-[80] bg-blue-700 text-white p-2 rounded-lg shadow-lg print:hidden"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className="fixed top-0 left-0 w-full bg-blue-700 text-white text-[10px] py-1 px-4 z-[60] flex items-center justify-center shadow-md font-bold print:hidden uppercase tracking-widest text-black">
         <ShieldCheck size={12} className="mr-2"/> Secure Local Processing - B5 Design Standard
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:relative top-0 left-0 w-80 bg-white shadow-2xl p-6 flex flex-col gap-6 z-[70] h-screen overflow-y-auto print:hidden pt-12 border-r border-gray-200 text-left text-black transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="border-b-2 border-blue-600 pb-3">
          <h1 className="text-xl font-black text-gray-800 flex items-center gap-2 text-black">
             <BarChart3 className="text-blue-600" size={24}/>成績單產生器 <span className="text-sm font-bold text-gray-500">v5.0</span>
          </h1>
          <p className="text-[11px] text-gray-500 font-bold mt-1 text-black">專為國中小教師設計 (B5標準格式)</p>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 cursor-pointer group transition-colors">
            <Upload className="mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-blue-700 text-sm">匯入 Excel 成績檔</span>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => { handleFileUpload(e); setIsSidebarOpen(false); }} className="hidden" />
          </label>

          <div className="grid grid-cols-2 gap-3 text-sm font-bold text-black">
            <div>
              <label className="block text-gray-600 text-xs mb-1 text-black">學校名稱</label>
              <input type="text" value={semesterInfo.schoolName} onChange={e => setSemesterInfo({...semesterInfo, schoolName: e.target.value})} className="w-full border p-2 rounded-lg text-black bg-white" placeholder="XX國小"/>
            </div>
            <div>
              <label className="block text-gray-600 text-xs mb-1 text-black">考試別</label>
              <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full border p-2 rounded-lg text-black bg-white">
                <option>期中考</option><option>期末考</option><option>平時成績</option><option>模擬考</option>
              </select>
            </div>
            <div>
               <label className="block text-gray-600 text-xs mb-1 text-black">學年</label>
               <input type="text" value={semesterInfo.year} onChange={e => setSemesterInfo({...semesterInfo, year: e.target.value})} className="w-full border p-2 rounded-lg text-black bg-white" placeholder="112"/>
            </div>
            <div>
               <label className="block text-gray-600 text-xs mb-1 text-black">學期</label>
               <select value={semesterInfo.term} onChange={e => setSemesterInfo({...semesterInfo, term: e.target.value})} className="w-full border p-2 rounded-lg text-black bg-white">
                 <option value="1">第一學期</option><option value="2">第二學期</option>
               </select>
            </div>
            <div>
               <label className="block text-gray-600 text-xs mb-1 text-black">年級</label>
               <input type="text" value={semesterInfo.grade} onChange={e => setSemesterInfo({...semesterInfo, grade: e.target.value})} className="w-full border p-2 rounded-lg text-black bg-white" placeholder="一"/>
            </div>
            <div>
               <label className="block text-gray-600 text-xs mb-1 text-black">班號</label>
               <input type="text" value={semesterInfo.classNumber} onChange={e => setSemesterInfo({...semesterInfo, classNumber: e.target.value})} className="w-full border p-2 rounded-lg text-black bg-white" placeholder="1"/>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl space-y-3 font-bold text-sm border text-black">
          <div className="text-gray-700 mb-2 flex items-center gap-2 border-b pb-2 text-black"><Search size={16}/> 顯示設定 (即時預覽)</div>
          <label className="flex items-center gap-2 cursor-pointer text-black">
            <input type="checkbox" checked={showChart} onChange={e => setShowChart(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            顯示班級落點分析圖 (箱型圖)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-black">
            <input type="checkbox" checked={showExplanation} onChange={e => setShowExplanation(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            顯示箱型圖說明
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-black">
            <input type="checkbox" checked={showRank} onChange={e => setShowRank(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            顯示班平均分數
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-black">
            <input type="checkbox" checked={isHighlightEnabled} onChange={e => setIsHighlightEnabled(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            異常分數高亮提示 (<span className="text-red-500">&lt;60</span> 或 退步 <span className="text-red-500">10分</span>)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-black">
            <input type="checkbox" checked={showQrCode} onChange={e => setShowQrCode(e.target.checked)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
            顯示分析平台 QR Code
          </label>
          {showQrCode && (
             <label className="flex items-center justify-center w-full p-2 mt-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors text-black text-xs">
               <ImageIcon className="mr-2 text-gray-500" size={16} />
               <span className="font-bold text-gray-600">更換自訂 QR Code 圖片</span>
               <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
             </label>
          )}
        </div>

        <div className="mt-auto pt-4 space-y-3">
          <button 
             onClick={downloadSinglePDF} 
             disabled={isProcessing || students.length === 0} 
             className="w-full bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 flex justify-center items-center font-bold shadow-lg transition-transform active:scale-95 text-black"
          >
             {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <FileDown className="mr-2"/>} 下載目前畫面 (PDF)
          </button>
          
          <button 
             onClick={downloadMergedPDF} 
             disabled={isProcessing || students.length === 0} 
             className="w-full bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 flex justify-center items-center font-bold shadow-lg transition-transform active:scale-95 text-black relative overflow-hidden"
          >
             {isProcessing ? (
                <>
                  <div className="absolute inset-0 bg-emerald-800 opacity-20" style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}></div>
                  <Loader2 className="animate-spin mr-2 z-10"/>
                  <span className="z-10">處理中 {downloadProgress.current}/{downloadProgress.total}</span>
                </>
             ) : (
                <><Users className="mr-2"/> 合併下載全班 (PDF)</>
             )}
          </button>
          
          <button 
             onClick={handlePrint} 
             disabled={isProcessing || students.length === 0} 
             className="w-full bg-slate-700 text-white p-3 rounded-xl hover:bg-slate-800 disabled:bg-gray-300 flex justify-center items-center font-bold shadow-lg transition-transform active:scale-95 text-black"
          >
             <Printer className="mr-2"/> 原生列印 / 存檔 (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-gray-500 overflow-auto relative scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-600 p-8 text-black print:p-0 print:bg-white print:overflow-visible">
        {/* Sticky Zoom Control */}
        <div className="sticky top-6 left-0 right-0 mx-auto w-fit z-[70] bg-white/90 backdrop-blur-sm rounded-full shadow-2xl border border-gray-200 px-6 py-2 flex items-center gap-6 print:hidden text-black mb-8">
            <div className="flex items-center gap-4 text-black">
              <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="p-1.5 hover:bg-gray-200 rounded-full disabled:opacity-30 text-black">
                <ChevronLeft size={24}/>
              </button>
              <span className="font-bold min-w-[80px] text-center text-sm text-black">
                {students.length > 0 ? `${currentIndex + 1} / ${students.length}` : '0 / 0'}
              </span>
              <button onClick={() => setCurrentIndex(prev => Math.min(students.length - 1, prev + 1))} disabled={currentIndex === students.length - 1} className="p-1.5 hover:bg-gray-200 rounded-full disabled:opacity-30 text-black">
                <ChevronRight size={24}/>
              </button>
            </div>
            <div className="w-px h-6 bg-gray-300"></div>
            <div className="flex items-center gap-3 text-black">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-gray-200 rounded-full text-black"><ZoomOut size={20}/></button>
              <span className="font-bold text-sm w-12 text-center text-black">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-gray-200 rounded-full text-black"><ZoomIn size={20}/></button>
              <button onClick={() => setZoom(1)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 ml-1 text-black"><Maximize2 size={16}/></button>
            </div>
        </div>

        <div className="flex justify-center items-start origin-top text-black print:hidden" style={{ transform: `scale(${zoom})`, minWidth: '971px', transition: 'transform 0.2s ease' }}>
          {students.length > 0 ? (
            <div id="single-report-card">
              <ReportCard 
                student={students[currentIndex]}
                stats={subjectStats}
                semesterInfo={semesterInfo}
                examType={examType}
                showRank={showRank}
                showExtremes={showExtremes}
                showChart={showChart}
                showQrCode={showQrCode}
                showExplanation={showExplanation}
                uploadedQrCode={uploadedQrCode}
                isHighlightEnabled={isHighlightEnabled}
              />
            </div>
          ) : (
            <div className="w-[971px] h-[688px] bg-white flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 font-bold text-xl text-black">
               請先匯入 Excel 檔案
            </div>
          )}
        </div>
        
        {/* 在列印模式時，渲染所有學生的 ReportCard，平常隱藏 */}
        <div id="print-container" className="hidden print:block">
          {students.map((student, idx) => (
             <div key={idx} className="print-page-wrapper" style={{ pageBreakAfter: 'always', width: '100%', height: '100%' }}>
               <ReportCard 
                  student={student}
                  stats={subjectStats}
                  semesterInfo={semesterInfo}
                  examType={examType}
                  showRank={showRank}
                  showExtremes={showExtremes}
                  showChart={showChart}
                  showQrCode={showQrCode}
                  showExplanation={showExplanation}
                  uploadedQrCode={uploadedQrCode}
                  isHighlightEnabled={isHighlightEnabled}
                />
             </div>
          ))}
        </div>
      </div>
      
      <SubjectMappingModal 
        isOpen={isMappingOpen} 
        onClose={() => setIsMappingOpen(false)} 
        detectedColumns={detectedRawColumns} 
        onConfirm={handleMappingConfirm} 
      />
    </div>
  );
}
