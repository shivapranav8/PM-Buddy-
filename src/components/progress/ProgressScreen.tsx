import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Session } from '../../App';
import Navigation from '../common/Navigation';
import EmptyState from '../common/EmptyState';
import Footer from '../common/Footer';

interface ProgressScreenProps {
  user: User;
  sessions: Session[];
  onLogout: () => void;
}

const ROUND_LABELS: { [key: string]: string } = {
  'product-sense': 'Product Improvement',
  'rca': 'Root Cause Analysis',
  'metrics': 'Metrics',
  'guesstimates': 'Guesstimates',
  'technical': 'Product Design',
  'strategy': 'Product Strategy',
  'behavioral': 'Behavioral',
};

export default function ProgressScreen({ user, sessions: propSessions, onLogout }: ProgressScreenProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all sessions from Firestore
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const q = query(
          collection(db, 'interviews'),
          where('userId', '==', user.id)
        );

        const querySnapshot = await getDocs(q);
        const loadedSessions: Session[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.insights && data.insights.score !== undefined) {
            loadedSessions.push({
              id: doc.id,
              date: data.startTime?.toDate().toISOString() || new Date().toISOString(),
              roundType: data.roundType || 'unknown',
              score: data.insights.score || 0,
              difficulty: data.difficulty || 'MEDIUM',
              transcript: '',
              insights: data.insights
            });
          }
        });

        // Sort by date client-side
        loadedSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSessions(loadedSessions);
        setLoading(false);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setLoading(false);
      }
    };

    loadSessions();
  }, [user.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation user={user} currentPage="progress" onLogout={onLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <p className="text-slate-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalSessions = sessions.length;
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / totalSessions)
    : 0;

  // Get scores by round
  const roundScores: { [key: string]: number[] } = {};
  sessions.forEach(session => {
    if (!roundScores[session.roundType]) {
      roundScores[session.roundType] = [];
    }
    roundScores[session.roundType].push(session.score);
  });

  const avgByRound = Object.entries(roundScores).map(([roundType, scores]) => ({
    roundType,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length
  })).sort((a, b) => b.avgScore - a.avgScore);

  // Weekly heatmap (last 4 weeks)
  const weeks = 4;
  const days = 7;
  const heatmapData: number[][] = [];
  const today = new Date();

  for (let week = 0; week < weeks; week++) {
    const weekData: number[] = [];
    for (let day = 0; day < days; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() - (week * 7 + day));
      const sessionsOnDay = sessions.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate.toDateString() === currentDate.toDateString();
      }).length;
      weekData.unshift(sessionsOnDay);
    }
    heatmapData.unshift(weekData);
  }

  // Trend data (last 10 sessions)
  const trendData = sessions.slice(0, 10).reverse();

  // Top 3 improvement areas
  const improvementAreas = avgByRound
    .filter(r => r.avgScore < 70)
    .slice(0, 3);

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation user={user} currentPage="progress" onLogout={onLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="No progress data yet"
            description="Complete your first mock interview to see analytics and track your improvement over time."
            action={
              <Link
                to="/library"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Start First Mock
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation user={user} currentPage="progress" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-slate-900 mb-2">Progress & Analytics</h1>
          <p className="text-slate-600">Track your improvement across all interview rounds</p>
        </div>

        {/* Summary stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-600">Total Sessions</p>
                <p className="text-slate-900 text-2xl">{totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-slate-600">Average Score</p>
                <p className="text-slate-900 text-2xl">{avgScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-600">This Week</p>
                <p className="text-slate-900 text-2xl">{Math.min(sessions.length, 7)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Practice heatmap */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-slate-900 mb-4">Practice Activity</h3>
            <div className="space-y-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-12 text-slate-600 text-xs">{day}</span>
                  <div className="flex gap-1">
                    {heatmapData.map((week, weekIndex) => {
                      const count = week[dayIndex];
                      let bgColor = 'bg-slate-100';
                      if (count > 0) bgColor = 'bg-indigo-200';
                      if (count > 1) bgColor = 'bg-indigo-400';
                      if (count > 2) bgColor = 'bg-indigo-600';

                      return (
                        <div
                          key={weekIndex}
                          className={`w-8 h-8 ${bgColor} rounded border border-slate-200`}
                          title={`${count} sessions`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average by round */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-slate-900 mb-4">Performance by Round</h3>
            <div className="space-y-4">
              {avgByRound.map(round => (
                <div key={round.roundType}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-700">{ROUND_LABELS[round.roundType]}</span>
                    <span className="text-slate-900">{round.avgScore}% ({round.count})</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${round.avgScore >= 70 ? 'bg-green-500' :
                        round.avgScore >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                      style={{ width: `${round.avgScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend line */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-slate-900 mb-6">Score Trend (Last 10 Sessions)</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {trendData.map((session, index) => {
              const height = session.score; // Already a percentage (0-100)
              return (
                <div key={session.id} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end" style={{ height: '240px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${session.score >= 70 ? 'bg-green-500' :
                        session.score >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                      style={{ height: `${height}%` }}
                      title={`Session ${index + 1}: ${session.score}%`}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{index + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 3 improvement areas */}
        {improvementAreas.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <h3 className="text-slate-900 mb-4">Top Improvement Areas</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {improvementAreas.map((area, index) => (
                <div key={area.roundType} className="bg-white rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-slate-900">{ROUND_LABELS[area.roundType]}</span>
                  </div>
                  <p className="text-slate-600">{area.avgScore}% avg</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
