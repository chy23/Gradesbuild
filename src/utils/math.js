export const calculateStats = (data, subjectKey) => {
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
