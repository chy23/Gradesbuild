export const parseInfoFromString = (text) => {
  let info = {};
  if (!text) return info;

  // 解析學校名稱 (尋找包含 國小/國中/高中/小學/中學/學校 的字串)
  const schoolMatch = text.match(/([^\s_]+?(?:國小|國中|高中|小學|中學|學校))/);
  if (schoolMatch) info.schoolName = schoolMatch[1];

  // 解析學年
  const yearMatch = text.match(/(\d{2,4})(?:學年度|學年|年)/);
  if (yearMatch) info.year = yearMatch[1];
  
  // 解析學期
  const termMatch = text.match(/第?([12一二上下])學期/);
  if (termMatch) {
     let term = termMatch[1];
     if (term === '上' || term === '一') term = '1';
     if (term === '下' || term === '二') term = '2';
     info.term = term;
  }
  
  // 進階混合格式解析 (例如 1142 -> 114學年 第2學期)
  const compactYearTermMatch = text.match(/(?:^|[^\d])(\d{3})([12])(?!\d)/);
  if (compactYearTermMatch) {
     if (!info.year) info.year = compactYearTermMatch[1];
     if (!info.term) info.term = compactYearTermMatch[2];
  }
  
  // 解析年級與班號 (例如：五年5班 -> grade:五, classNumber:5)
  const classMatch = text.match(/([一二三四五六七八九十])年(\d+)班/);
  if (classMatch) {
      info.grade = classMatch[1];
      info.classNumber = classMatch[2];
  } else {
      // 容錯：嘗試解析數字年級 (例如 5年5班) 並轉為中文
      const numClassMatch = text.match(/(\d)年(\d+)班/);
      if (numClassMatch) {
          const numMap = {'1':'一','2':'二','3':'三','4':'四','5':'五','6':'六','7':'七','8':'八','9':'九'};
          info.grade = numMap[numClassMatch[1]] || numClassMatch[1];
          info.classNumber = numClassMatch[2];
      }
  }

  // 解析考試別
  // 將「期末」放在「期中」前面，如果兩者都有（例如：期中期末統計表），「期中」就會覆蓋「期末」，從而優先判定為期中考
  if (text.includes('期末')) info.examType = '期末考';
  if (text.includes('期中')) info.examType = '期中考';
  if (text.includes('平時')) info.examType = '平時成績';
  if (text.includes('模擬')) info.examType = '模擬考';
  
  return info;
};
