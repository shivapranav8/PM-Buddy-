import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Session } from '../../App';
import ScoreRing from './ScoreRing';
import RubricBar from './RubricBar';

interface InsightsScreenProps {
  user: User;
  sessions: Session[];
}

const ROUND_LABELS: { [key: string]: string } = {
  'product-sense': 'Product Improvement',
  'rca': 'Root Cause Analysis',
  'metrics': 'Metrics',
  'guesstimates': 'Guesstimates',
  'technical': 'Product Design',
  'strategy': 'Product Strategy',
  'behavioral': 'Behavioral'
};

export default function InsightsScreen({ user, sessions }: InsightsScreenProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null | undefined>(
    sessions.find(s => s.id === sessionId)
  );
  const [loading, setLoading] = useState(!session);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`Setting up real-time listener for session: ${sessionId}`);

    const unsubscribe = onSnapshot(
      doc(db, 'interviews', sessionId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const hasInsights = !!data.insights;

          if (hasInsights) {
            const fetchedSession: any = {
              id: docSnap.id,
              date: data.startTime?.toDate().toISOString() || new Date().toISOString(),
              roundType: data.roundType || 'General',
              score: data.insights?.score || 0,
              difficulty: data.difficulty || 'MEDIUM',
              transcript: '',
              insights: data.insights
            };

            console.log('Updated session score:', fetchedSession.score);
            setSession(fetchedSession);
            setLoading(false);
          } else {
            console.log('Waiting for insights to be generated...');
            // Keep loading as true
          }
        } else {
          console.log("No such session!");
          setSession(null);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error listening to session:", error);
        setSession(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-white mb-2 font-sans tracking-tight text-2xl font-bold">Analyzing your performance...</h2>
          <p className="text-slate-400 font-sans">Our harsh bar-raiser is reviewing your responses.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-slate-900 mb-4">Session not found</h2>
          <Link to="/home" className="text-indigo-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-slate-900">Interview Insights</h1>
              <p className="text-slate-600">
                {ROUND_LABELS[session.roundType]} • {new Date(session.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actual Root Cause (Primary for RCA) */}
        {session.roundType === 'rca' && session.insights.actual_root_cause && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
            <h3 className="text-slate-900 mb-6 font-bold">Actual Root Cause</h3>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-indigo-800 leading-relaxed text-lg">
                    {session.insights.actual_root_cause}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col items-center">
              <ScoreRing score={session.score} size={200} />
            </div>

            <div>
              <h3 className="text-slate-900 mb-4 font-bold">Assessment Dimensions</h3>
              <div className="space-y-4">
                {session.insights.scores && Object.entries(session.insights.scores).map(([dimension, score]) => (
                  <RubricBar key={dimension} label={dimension} score={score as number} />
                ))}
                {(!session.insights.scores || Object.keys(session.insights.scores).length === 0) && (
                  <p className="text-slate-500 text-sm">Waiting for detailed scoring...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Analysis (Only if not RCA or if RCA but no root cause yet) */}
        {(!session.insights.actual_root_cause || session.roundType !== 'rca') && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
            <h3 className="text-slate-900 mb-6 font-bold">Timeline Analysis</h3>
            <div className="space-y-4">
              {session.insights.timeline?.map((event, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 ${event.type === 'strong'
                    ? 'bg-green-50 border-green-200'
                    : event.type === 'missed'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${event.type === 'strong'
                      ? 'bg-green-100'
                      : event.type === 'missed'
                        ? 'bg-amber-100'
                        : 'bg-slate-100'
                      }`}>
                      {event.type === 'strong' ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : event.type === 'missed' ? (
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`mb-1 ${event.type === 'strong'
                        ? 'text-green-900'
                        : event.type === 'missed'
                          ? 'text-amber-900'
                          : 'text-slate-900'
                        }`}>
                        {event.timestamp} • {event.type === 'strong' ? 'Strong Moment' : event.type === 'missed' ? 'Missed Opportunity' : 'Note'}
                      </div>
                      <p className={
                        event.type === 'strong'
                          ? 'text-green-800'
                          : event.type === 'missed'
                            ? 'text-amber-800'
                            : 'text-slate-700'
                      }>
                        {event.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What you did well */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-slate-900">What You Did Well</h3>
            </div>
            <ul className="space-y-3">
              {session.insights.strengths?.map((strength, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-700">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-slate-900">What to Improve Next</h3>
            </div>
            <ul className="space-y-3">
              {session.insights.improvements?.map((improvement, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-700">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0" />
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Suggested drills */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-6">
          <h3 className="text-white mb-3">Your Next Best Drill</h3>
          <p className="text-indigo-100 mb-6">
            Structured beats perfect. Practice {ROUND_LABELS[session.roundType]} again or try Metrics → Funnel RCA
          </p>
          <div className="flex gap-3">
            <Link
              to={`/library`}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Retry Similar Question
            </Link>
            <Link
              to="/library"
              className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-colors"
            >
              Try Different Round
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <Link
            to="/home"
            className="px-8 py-4 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
