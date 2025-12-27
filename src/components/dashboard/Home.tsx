import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Session } from '../../App';
import Navigation from '../common/Navigation';
import ReadinessCard from './ReadinessCard';
import SessionList from './SessionList';
import EmptyState from '../common/EmptyState';

interface HomeProps {
  user: User;
  sessions: Session[];
  onLogout: () => void;
}

export default function Home({ user, sessions: propSessions, onLogout }: HomeProps) {
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
        <Navigation user={user} currentPage="home" onLogout={onLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate streak (mock)
  const streak = sessions.length > 0 ? Math.min(sessions.length, 7) : 0;

  // Calculate overall score
  const overallScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / sessions.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation user={user} currentPage="home" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-slate-900 mb-2">
            Hey {user.name.split(' ')[0]} 👋
          </h1>
          {streak > 0 ? (
            <p className="text-slate-600">
              You've practiced <span className="text-indigo-600">{streak}</span> rounds this week. Keep it up!
            </p>
          ) : (
            <p className="text-slate-600">
              Ready to start your PM interview prep journey?
            </p>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Empty state */}
            <div className="md:col-span-2">
              <EmptyState
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                title="No practice sessions yet"
                description="Start your first mock interview to see your readiness score and track progress."
                action={
                  <Link
                    to="/library"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Start a Mock
                  </Link>
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column - Readiness */}
            <div className="lg:col-span-2 space-y-6">
              <ReadinessCard sessions={sessions} overallScore={overallScore} />

              {/* Quick action */}
              <Link
                to="/library"
                className="block p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl text-white hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white mb-2">Start a Mock Interview</h3>
                    <p className="text-indigo-100">
                      Pick from 7 core PM interview rounds
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

            {/* Right column - Recent Sessions */}
            <div className="lg:col-span-1">
              <SessionList sessions={sessions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
