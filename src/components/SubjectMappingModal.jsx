import React, { useState, useEffect } from 'react';
import { List } from 'lucide-react';

export const SubjectMappingModal = ({ isOpen, onClose, detectedColumns, onConfirm }) => {
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
