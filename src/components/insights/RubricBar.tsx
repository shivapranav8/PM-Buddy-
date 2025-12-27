interface RubricBarProps {
  label: string;
  score: number;
}

export default function RubricBar({ label, score }: RubricBarProps) {
  // Determine color based on score
  let barColor = 'bg-red-500';
  let bgColor = 'bg-red-100';
  
  if (score >= 70) {
    barColor = 'bg-green-500';
    bgColor = 'bg-green-100';
  } else if (score >= 50) {
    barColor = 'bg-amber-500';
    bgColor = 'bg-amber-100';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-900">{score}%</span>
      </div>
      <div className={`h-3 ${bgColor} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
