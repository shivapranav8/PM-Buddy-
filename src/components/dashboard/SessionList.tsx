import { Link } from 'react-router-dom';
import { Session } from '../../App';

interface SessionListProps {
  sessions: Session[];
}

const ROUND_ICONS: { [key: string]: string } = {
  'product-sense': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  'rca': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  'metrics': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'guesstimates': 'M4 6h16M4 10h16M4 14h16M4 18h16',
  'prioritization': 'M4 6h16M4 10h16M4 14h16M4 18h16', // Legacy
  'technical': 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  'strategy': 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  'behavioral': 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

const getRoundLabel = (type: string) => {
  const labels: { [key: string]: string } = {
    'product-sense': 'Product Improvement',
    'rca': 'Root Cause Analysis',
    'metrics': 'Metrics',
    'guesstimates': 'Guesstimates',
    'prioritization': 'Guesstimates', // Legacy support
    'technical': 'Product Design',
    'strategy': 'Product Strategy',
    'behavioral': 'Behavioral'
  };
  return labels[type] || 'Mock Interview';
};

export default function SessionList({ sessions }: SessionListProps) {
  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-slate-900 mb-4">Recent Sessions</h3>

      <div className="space-y-3">
        {recentSessions.map(session => {
          const scoreColor = session.score >= 70 ? 'text-green-600' : session.score >= 50 ? 'text-amber-600' : 'text-red-600';
          const scoreBg = session.score >= 70 ? 'bg-green-50' : session.score >= 50 ? 'bg-amber-50' : 'bg-red-50';

          return (
            <Link
              key={session.id}
              to={`/insights/${session.id}`}
              className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ROUND_ICONS[session.roundType] || ROUND_ICONS['product-sense']} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-slate-900">{getRoundLabel(session.roundType)}</p>
                    <p className="text-slate-500">{new Date(session.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`px-3 py-1.5 ${scoreBg} rounded-lg`}>
                  <span className={scoreColor}>{session.score}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="inline-flex items-center gap-1 text-xs">
                  <span className={`px-2 py-0.5 rounded ${session.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    session.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    {session.difficulty}
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {sessions.length > 5 && (
        <Link
          to="/progress"
          className="mt-4 block text-center text-indigo-600 hover:text-indigo-700"
        >
          View all sessions →
        </Link>
      )}
    </div>
  );
}
