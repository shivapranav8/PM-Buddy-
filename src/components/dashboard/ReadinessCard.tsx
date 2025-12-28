import { Session } from '../../App';
import ScoreRing from '../insights/ScoreRing';

interface ReadinessCardProps {
  sessions: Session[];
  overallScore: number;
}

const ROUND_TYPES = [
  { id: 'product-sense', label: 'Product Improvement', color: 'bg-blue-500' },
  { id: 'rca', label: 'RCA', color: 'bg-purple-500' },
  { id: 'metrics', label: 'Metrics', color: 'bg-green-500' },
  { id: 'guesstimates', label: 'Guesstimates', color: 'bg-yellow-500' },
  { id: 'technical', label: 'Product Design', color: 'bg-red-500' },
  { id: 'strategy', label: 'Product Strategy', color: 'bg-indigo-500' }
];

export default function ReadinessCard({ sessions, overallScore }: ReadinessCardProps) {
  // Calculate scores by round type
  const scoresByRound = ROUND_TYPES.map(round => {
    const roundSessions = sessions.filter(s => s.roundType === round.id);
    const avgScore = roundSessions.length > 0
      ? Math.round(roundSessions.reduce((acc, s) => acc + s.score, 0) / roundSessions.length)
      : 0;
    return { ...round, score: avgScore, count: roundSessions.length };
  });

  // Calculate strengths and improvements
  const sortedByScore = [...scoresByRound].sort((a, b) => b.score - a.score);
  const strengths = sortedByScore.slice(0, 3).filter(r => r.count > 0 && r.score >= 70);
  const improvements = sortedByScore.reverse().slice(0, 3).filter(r => r.count > 0 && r.score < 70);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
      <h2 className="text-slate-900 mb-6">Your PM Interview Readiness</h2>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Score ring */}
        <div className="flex flex-col items-center justify-center">
          <ScoreRing score={overallScore} size={180} />
          <p className="mt-4 text-slate-600">Overall Score</p>
        </div>

        {/* Breakdown by round */}
        <div className="space-y-3">
          {scoresByRound.map(round => (
            <div key={round.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-700">{round.label}</span>
                <span className="text-slate-900">
                  {round.count > 0 ? `${round.score}%` : '—'}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${round.color} rounded-full transition-all duration-500`}
                  style={{ width: `${round.count > 0 ? round.score : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-green-900">Top Strengths</h3>
          </div>
          {strengths.length > 0 ? (
            <ul className="space-y-2">
              {strengths.map(s => (
                <li key={s.id} className="text-green-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  {s.label} ({s.score}%)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-700">Practice more to discover your strengths!</p>
          )}
        </div>

        {/* Improvements */}
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-amber-900">Areas to Improve</h3>
          </div>
          {improvements.length > 0 ? (
            <ul className="space-y-2">
              {improvements.map(s => (
                <li key={s.id} className="text-amber-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full" />
                  {s.label} ({s.score}%)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-amber-700">Keep practicing to identify improvement areas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
