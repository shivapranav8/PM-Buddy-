interface ScoreRingProps {
  score: number;
  size?: number;
}

export default function ScoreRing({ score, size = 200 }: ScoreRingProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Determine color based on score
  let color = '#ef4444'; // red for low scores
  if (score >= 70) color = '#22c55e'; // green for good scores
  else if (score >= 50) color = '#f59e0b'; // amber for medium scores

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-slate-900" style={{ fontSize: size / 4 }}>
          {score}
        </span>
        <span className="text-slate-500" style={{ fontSize: size / 12 }}>
          / 100
        </span>
      </div>
    </div>
  );
}
