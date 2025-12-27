import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Session } from '../../App';
import avatarImage from 'figma:asset/e2143739e185d0c1c1982df0065d1a83a95f60f4.png';

interface LiveInterviewProps {
  user: User;
  onComplete: (session: Session) => void;
}

interface TranscriptMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: number;
}

const MOCK_QUESTIONS: { [key: string]: string } = {
  'product-sense': 'Design a feature to help people discover new restaurants in their neighborhood.',
  'rca': 'Instagram Stories engagement dropped 15% last week. Investigate the root cause.',
  'metrics': 'You just launched a new checkout flow. What metrics would you track to measure success?',
  'prioritization': 'You have 3 features on your roadmap but can only ship 1 this quarter. How do you decide?',
  'technical': 'Explain how Google Search works from the moment a user types a query.',
  'strategy': 'Should Spotify enter the podcast creation tools market?',
  'behavioral': 'Tell me about a time you had to prioritize a feature request over technical debt.'
};

const ROUND_NAMES: { [key: string]: string } = {
  'product-sense': 'Product Sense',
  'rca': 'Root Cause Analysis',
  'metrics': 'Metrics & Analytics',
  'prioritization': 'Prioritization',
  'technical': 'Technical Deep-Dive',
  'strategy': 'Strategy',
  'behavioral': 'Behavioral'
};

const AI_RESPONSES = [
  "That's an interesting approach. Can you tell me more about why you chose that direction?",
  "I see. What trade-offs did you consider when making that decision?",
  "Good point. How would you measure the success of that solution?",
  "Interesting. What would be the biggest challenges in implementing that?",
  "Can you elaborate on that? I'd like to understand your thought process better.",
  "That makes sense. What alternatives did you consider?",
  "Great. How does this align with the overall product strategy?",
  "I understand. What would be your next steps if you saw the metrics dropping?",
  "Could you walk me through the user journey for that feature?",
  "Interesting perspective. What data would you need to validate that hypothesis?",
  "That makes sense. Moving on to prioritization. Tell me about a time you had to prioritize a feature request over technical debt."
];

export default function LiveInterview({ user, onComplete }: LiveInterviewProps) {
  const { roundType } = useParams<{ roundType: string }>();
  const navigate = useNavigate();
  
  const [isGenerating, setIsGenerating] = useState(true);
  const [question, setQuestion] = useState('');
  const [currentQuestionNum, setCurrentQuestionNum] = useState(3);
  const [totalQuestions] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(105); // 1:45 in seconds
  const [timeElapsed, setTimeElapsed] = useState(1112); // 00:18:32
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [privateNote, setPrivateNote] = useState('');
  
  // Interview states
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarState, setAvatarState] = useState<'idle' | 'talking' | 'listening'>('idle');
  
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Load config from session storage
  const config = JSON.parse(sessionStorage.getItem('interview-config') || '{}');

  useEffect(() => {
    // Simulate question generation with initial transcript
    setTimeout(() => {
      const initialQuestion = MOCK_QUESTIONS[roundType || 'behavioral'] || MOCK_QUESTIONS['behavioral'];
      setQuestion(initialQuestion);
      
      // Initialize transcript with sample conversation
      setTranscript([
        {
          id: '1',
          role: 'interviewer',
          content: "Let's start with a warm-up. Can you introduce yourself and tell me why you're interested in Product Management?",
          timestamp: Date.now() - 300000
        },
        {
          id: '2',
          role: 'candidate',
          content: "Sure! I have a background in engineering, but I realized I enjoyed the \"why\" and \"what\" more than the \"how\". That led me to explore PM roles...",
          timestamp: Date.now() - 240000
        },
        {
          id: '3',
          role: 'interviewer',
          content: initialQuestion,
          timestamp: Date.now() - 120000
        }
      ]);
      
      setIsGenerating(false);
      
      // Show listening state after question
      setTimeout(() => {
        setAvatarState('listening');
        setIsListening(true);
      }, 1000);
    }, 2000);
  }, [roundType]);

  // Timer for time remaining
  useEffect(() => {
    if (!isGenerating && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, timeRemaining]);

  // Timer for elapsed time
  useEffect(() => {
    if (!isGenerating) {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptScrollRef.current?.scrollTo({
      top: transcriptScrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [transcript]);

  const handleToggleMic = () => {
    if (isListening) {
      // Stop listening - user is done speaking
      setIsListening(false);
      setAvatarState('idle');
      
      // Simulate adding candidate response
      const mockResponse = "I think the key is to evaluate both the short-term impact and long-term technical health. I'd start by quantifying the business value of the feature request and the cost of not addressing the technical debt...";
      
      setTimeout(() => {
        setTranscript(prev => [...prev, {
          id: Date.now().toString(),
          role: 'candidate',
          content: mockResponse,
          timestamp: Date.now()
        }]);
        
        // AI responds after candidate
        setTimeout(() => {
          setAvatarState('talking');
          setIsSpeaking(true);
          
          setTimeout(() => {
            const aiResponse = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
            setTranscript(prev => [...prev, {
              id: Date.now().toString(),
              role: 'interviewer',
              content: aiResponse,
              timestamp: Date.now()
            }]);
            
            setTimeout(() => {
              setAvatarState('listening');
              setIsListening(true);
              setIsSpeaking(false);
            }, 3000);
          }, 1500);
        }, 1000);
      }, 500);
    } else {
      // Start listening
      setIsListening(true);
      setAvatarState('listening');
    }
  };

  const handleEndInterview = () => {
    // Generate mock session data
    const mockScore = Math.floor(Math.random() * 30) + 60;
    
    const mockSession: Session = {
      id: 'session-' + Date.now(),
      date: new Date().toISOString(),
      roundType: roundType || 'behavioral',
      score: mockScore,
      difficulty: config.difficulty || 'Medium',
      transcript: transcript.map(t => `${t.role === 'interviewer' ? 'Interviewer' : 'You'}: ${t.content}`).join('\n\n'),
      insights: {
        scores: {
          'Structure': Math.floor(Math.random() * 20) + 70,
          'User Empathy': Math.floor(Math.random() * 20) + 65,
          'Business Thinking': Math.floor(Math.random() * 20) + 60,
          'Clarity': Math.floor(Math.random() * 20) + 75,
          'Tradeoffs': Math.floor(Math.random() * 20) + 55
        },
        strengths: [
          'Clear communication and well-structured thinking',
          'Strong user empathy demonstrated throughout',
          'Good consideration of edge cases'
        ],
        improvements: [
          'Could have explored more alternative solutions',
          'Missing discussion of success metrics',
          'Limited consideration of technical constraints'
        ],
        timeline: [
          { timestamp: '2:15', type: 'strong', text: 'Excellent user segmentation approach' },
          { timestamp: '8:43', type: 'missed', text: 'Missed opportunity to discuss monetization' },
          { timestamp: '12:20', type: 'strong', text: 'Great prioritization framework' }
        ]
      }
    };

    onComplete(mockSession);
    navigate(`/insights/${mockSession.id}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeProgress = () => {
    return ((105 - timeRemaining) / 105) * 100;
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-white mb-2">Preparing your interview...</h2>
          <p className="text-slate-400">
            Creating a {config.difficulty || 'medium'} difficulty question
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1020] flex flex-col">
      {/* Top Header Bar */}
      <div className="h-16 bg-[#1A2332] border-b border-slate-700/50 flex items-center justify-between px-6">
        {/* Left: Logo + Recording indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 10a2 2 0 114 0 2 2 0 01-4 0z"/>
              </svg>
            </div>
            <span className="text-white font-semibold">PM Buddy</span>
          </div>
          
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span>REC {formatElapsedTime(timeElapsed)}</span>
          </div>
        </div>

        {/* Right: Settings + End Session */}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-slate-300 hover:text-white transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Interviewer Panel */}
        <div className="flex-1 relative flex items-center justify-center p-6">
          
          {/* Question Card - Top Left */}
          <div className="absolute top-6 left-6 max-w-md z-10">
            <div className="bg-[#1A2942] border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-cyan-400 text-xs font-medium">QUESTION {currentQuestionNum} OF {totalQuestions}</span>
                <button className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center hover:bg-slate-600/50 transition-colors">
                  <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="2"/>
                  </svg>
                </button>
              </div>
              <p className="text-white text-sm leading-relaxed mb-4">
                {question}
              </p>
            </div>
          </div>

          {/* Listening Indicator - Top Right */}
          {isListening && (
            <div className="absolute top-6 right-6 z-10">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl backdrop-blur-sm">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" />
                  <div className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-cyan-300 text-sm">Listening...</span>
              </div>
            </div>
          )}

          {/* Avatar - Centered */}
          <div className="relative flex items-center justify-center">
            <img 
              src={avatarImage}
              alt="AI Interviewer"
              className="max-h-[85vh] w-auto object-contain rounded-2xl border-2 border-white/10 shadow-2xl backdrop-blur-sm"
            />
            
            {/* Waveform overlay when speaking */}
            {isSpeaking && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="flex items-end gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-cyan-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 30 + 10}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10">
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isCameraOn 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={handleToggleMic}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/50 scale-110'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/30'
              }`}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {isListening && (
              <button
                onClick={handleToggleMic}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <span>Done Speaking</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right: Transcript Panel */}
        <div className="w-[400px] bg-[#172635] border-l border-slate-700/50 flex flex-col">
          
          {/* Header */}
          <div className="h-16 border-b border-slate-700/50 flex items-center justify-between px-5">
            <h3 className="text-white font-medium">Transcript</h3>
            <button className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm">
              Export
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={transcriptScrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            style={{ minHeight: 0 }}
          >
            {transcript.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {/* Label with avatar */}
                <div className="flex items-center gap-2">
                  {msg.role === 'interviewer' ? (
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                      <img src={avatarImage} alt="Interviewer" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-medium">
                      Y
                    </div>
                  )}
                  <span className={`text-sm ${msg.role === 'interviewer' ? 'text-slate-300' : 'text-cyan-300'}`}>
                    {msg.role === 'interviewer' ? 'Interviewer' : 'You'}
                  </span>
                </div>
                
                {/* Message bubble */}
                <div className={`text-sm leading-relaxed ${
                  msg.role === 'interviewer' 
                    ? 'text-slate-300 pl-8' 
                    : 'text-white bg-[#1E3A52] rounded-lg p-3 ml-8'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Listening indicator in transcript */}
            {isListening && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                  </div>
                  <span className="text-sm text-slate-300">Interviewer</span>
                </div>
                <div className="text-sm text-slate-400 italic pl-8">
                  Listening to your response...
                </div>
              </div>
            )}
          </div>

          {/* Private Note Input */}
          <div className="border-t border-slate-700/50 p-4">
            <div className="relative">
              <input
                type="text"
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                placeholder="Add a private note..."
                className="w-full bg-[#1A2942] border border-slate-700/50 rounded-lg px-4 py-3 pr-12 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowEndConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1A2942] border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white mb-3 text-center text-xl">End Interview?</h3>
              <p className="text-slate-400 mb-6 text-center">
                Your performance will be analyzed and you'll receive detailed insights with coaching feedback.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Continue Interview
                </button>
                <button
                  onClick={handleEndInterview}
                  className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Get Insights
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}