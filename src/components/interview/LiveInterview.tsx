import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Session } from '../../App';
import { startInterview, sendMessage, subscribeToMessages, endInterview } from '../../lib/firestore';

const avatarImage = '/interviewer.png';

interface LiveInterviewProps {
  user: User;
  onComplete: (session: Session) => void;
}

interface ConversationMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: number;
}

const ROUND_NAMES: { [key: string]: string } = {
  'product-sense': 'Product Improvement',
  'rca': 'Root Cause Analysis',
  'metrics': 'Metrics',
  'guesstimates': 'Guesstimates',
  'technical': 'Product Design',
  'strategy': 'Product Strategy',
  'behavioral': 'Behavioral'
};

export default function LiveInterview({ user, onComplete }: LiveInterviewProps) {
  const { roundType } = useParams<{ roundType: string }>();
  const navigate = useNavigate();

  // Core State
  const [isGenerating, setIsGenerating] = useState(true);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // UI State
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [privateNote, setPrivateNote] = useState(''); // Used for message input

  // Media State
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [avatarState, setAvatarState] = useState<'idle' | 'talking' | 'listening'>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false); // Used for visualizer

  // Refs
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const interviewIdRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pendingSpeakRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const initialQuestionSetRef = useRef<boolean>(false);

  // Load config
  const config = JSON.parse(sessionStorage.getItem('interview-config') || '{}');


  // Initialize Interview
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initInterview = async () => {
      try {
        const id = await startInterview(user.id, roundType || 'product-sense', config.difficulty || 'Medium');
        interviewIdRef.current = id;

        // Set a timeout to warn if backend doesn't respond
        timeoutId = setTimeout(() => {
          if (isGenerating) {
            setError("The AI interviewer is taking too long to respond. Please ensure the backend worker is running (cd server && npm start).");
          }
        }, 15000);

        // Subscribe to messages
        const unsubscribe = subscribeToMessages(id, (messages) => {
          if (messages.length === 0) return;

          const lastMsg = messages[messages.length - 1];

          // Update conversation state
          const formattedMessages: ConversationMessage[] = messages.map(m => ({
            id: m.id,
            role: m.sender === 'ai' ? 'interviewer' : 'candidate',
            content: m.text,
            timestamp: m.timestamp?.toMillis() || Date.now()
          }));
          setConversation(formattedMessages);

          // If last message is from AI, trigger speaking
          if (lastMsg.sender === 'ai') {
            if (lastMsg.text.startsWith('Error:') || lastMsg.text.startsWith("I'm having trouble")) {
              if (isGenerating) {
                setError(lastMsg.text);
              } else {
                setApiError(lastMsg.text);
              }
              setIsGenerating(false);
              clearTimeout(timeoutId);
              return;
            }

            // Note: The useEffect watching conversation & isAIResponding will trigger speak()

            // If this is the first AI message, treat it as the initial question for the floating box
            if (!initialQuestionSetRef.current) {
              const firstAIMessage = formattedMessages.find(m => m.role === 'interviewer');
              if (firstAIMessage) {
                setQuestion(firstAIMessage.content);
                initialQuestionSetRef.current = true;
                setIsGenerating(false);
                clearTimeout(timeoutId);
              }
            }
          }
        });

        // Subscription and first question trigger are handled by the backend worker 
        // which listens for status 'active' and empty message collection.
        setIsAIResponding(true);
        // await sendMessage(id, "I am ready for the interview. Please ask me the first question.", 'user');

        return () => {
          unsubscribe();
          clearTimeout(timeoutId);
        };
      } catch (error: any) {
        console.error("Failed to start interview", error);
        setError(`Failed to start interview: ${error.message || 'Unknown error'}`);
        setIsGenerating(false);
      }
    };

    initInterview();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.speechSynthesis.cancel();
    };
  }, [roundType, user.id]); // Removed 'voices' dependency to prevent restart

  // Prime audio on first interaction
  useEffect(() => {
    const primeAudio = () => {
      // Remove listeners IMMEDIATELY to prevent double-triggering
      window.removeEventListener('click', primeAudio);
      window.removeEventListener('touchstart', primeAudio);

      if ('speechSynthesis' in window) {
        // DO NOT cancel here, as it may interrupt a real speak request
        const u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        window.speechSynthesis.speak(u);
        console.log("Audio primed (silent utterance sent)");
      }
    };
    window.addEventListener('click', primeAudio);
    window.addEventListener('touchstart', primeAudio);
    return () => {
      window.removeEventListener('click', primeAudio);
      window.removeEventListener('touchstart', primeAudio);
    };
  }, []);

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setAvatarState('listening');
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        console.log("Recognized:", text);
        setPrivateNote(prev => (prev ? prev + ' ' + text : text));
      };

      recognition.onend = () => {
        setIsListening(false);
        if (avatarState === 'listening') {
          setAvatarState('idle');
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setAvatarState('idle');
      };

      recognitionRef.current = recognition;
    }
  }, [avatarState]);

  // Timer
  useEffect(() => {
    if (!isGenerating) {
      const interval = setInterval(() => {
        setTimeElapsed((prev: number) => prev + 1);
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
  }, [conversation]);

  const handleToggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setAvatarState('idle');
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) { console.error(e); }
    }
  };

  // Voice Selection
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available); // Keep this to populate the `voices` state if needed elsewhere

      // Map user accent preference to voice filters
      const accent = user.preferences?.voiceAccent || 'US English';
      let accentCode = 'en-US';
      if (accent === 'UK English') accentCode = 'en-GB';
      if (accent === 'Australian English') accentCode = 'en-AU';
      if (accent === 'Indian English') accentCode = 'en-IN';

      // Look for voices matching accent first
      const accentVoices = available.filter(v => v.lang.startsWith(accentCode));

      // Look for youthful male voices within accent group if possible, else global
      const maleVoices = (accentVoices.length > 0 ? accentVoices : available).filter(v =>
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('daniel') ||
        v.name.toLowerCase().includes('alex') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('guy') ||
        v.name.toLowerCase().includes('andrew')
      );

      // Prioritize specific high-quality voices if they match the requested accent
      let preferred = null;

      if (accent === 'US English') {
        preferred = maleVoices.find(v => v.name.includes('Alex')) || maleVoices.find(v => v.name.includes('Fred'));
      } else if (accent === 'UK English') {
        preferred = maleVoices.find(v => v.name.includes('Daniel'));
      }

      // Fallback: First male voice in accent -> First voice in accent -> First English voice
      setSelectedVoice(preferred || maleVoices[0] || accentVoices[0] || available.find(v => v.lang.startsWith('en')) || null);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = (text: string) => {
    // Check if voice is enabled in preferences (default to true)
    const isVoiceEnabled = user.preferences?.voiceEnabled ?? true;
    if (!text || !isVoiceEnabled) return;

    if ('speechSynthesis' in window) {
      // Clear any pending speak task
      if (pendingSpeakRef.current) {
        clearTimeout(pendingSpeakRef.current);
      }

      console.log("Speak requested:", text.substring(0, 30) + "...");

      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      // Mandatory delay for browser to clear its internal cancel state
      pendingSpeakRef.current = setTimeout(() => {
        console.log("Executing speak after 150ms reset delay.");
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Apply Speed Preference
        const speedPref = user.preferences?.voiceSpeed || 'Normal';
        let rate = 1.05; // Normal default
        if (speedPref === 'Slow') rate = 0.85;
        if (speedPref === 'Fast') rate = 1.25;

        utterance.rate = rate;
        utterance.pitch = 1.1; // Keep youthful pitch
        utterance.volume = 1.0;

        utterance.onstart = () => {
          console.log("Speech started officially");
          setAvatarState('talking');
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          console.log("Speech ended naturally");
          utteranceRef.current = null;
          setAvatarState('idle');
          setIsSpeaking(false);
          setIsListening(true);
          setAvatarState('listening');
          try {
            recognitionRef.current?.start();
          } catch (e) { }
        };

        utterance.onerror = (event) => {
          if (event.error === 'interrupted' || event.error === 'canceled') {
            console.log("Speech interrupted or canceled intentionally");
          } else {
            console.error("SpeechSynthesisUtterance error", event);
          }
          utteranceRef.current = null;
          setAvatarState('idle');
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
        pendingSpeakRef.current = null;
      }, 150); // Increased to 150ms for extra safety
    }
  };

  useEffect(() => {
    const lastMsg = conversation[conversation.length - 1];
    if (lastMsg && lastMsg.role === 'interviewer' && lastMsg.id !== lastSpokenIdRef.current) {
      const interviewerMsgs = conversation.filter(m => m.role === 'interviewer');
      let textToSpeak = lastMsg.content;

      // Prepend welcome message if it's the first question
      if (interviewerMsgs.length === 1 && !lastSpokenIdRef.current) {
        const roundName = ROUND_NAMES[roundType || 'product-sense'];
        textToSpeak = `Hello! I'm your AI interviewer for this session. We'll be focusing on ${roundName}. ${lastMsg.content}`;
      }

      lastSpokenIdRef.current = lastMsg.id;
      setIsAIResponding(false);
      speak(textToSpeak);
    }
  }, [conversation, roundType]);

  const handleSendMessage = async () => {
    if (!privateNote.trim()) return;

    if (interviewIdRef.current) {
      const text = privateNote;
      setPrivateNote(''); // Clear input
      setIsAIResponding(true); // Set BEFORE sending to catch fast response
      try {
        await sendMessage(interviewIdRef.current, text, 'user');
      } catch (e) {
        console.error("Failed to send text message", e);
        setIsAIResponding(false);
      }
    }
  };

  const handleEndInterview = async () => {
    if (interviewIdRef.current) {
      // Mark as completed to trigger backend evaluation
      await endInterview(interviewIdRef.current);
      setShowEndConfirm(false);
      navigate(`/insights/${interviewIdRef.current}`);
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper for REC format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // derived props for UI
  const currentQuestionNum = conversation.filter(m => m.role === 'interviewer').length || 1;
  const totalQuestions = 5; // Fixed for now

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          {error ? (
            <>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-white mb-2 text-xl font-semibold">Connection Error</h2>
              <p className="text-slate-400 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-white mb-2 font-sans tracking-tight text-2xl font-bold">Preparing your interview...</h2>
              <p className="text-slate-400 font-sans">
                Creating a {config.difficulty || 'medium'} difficulty question
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0B1020] flex flex-col font-sans overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-16 bg-[#1A2332] border-b border-slate-700/50 flex items-center justify-between px-6 z-50">
        {/* Left: Logo + Recording indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 10a2 2 0 114 0 2 2 0 01-4 0z" />
              </svg>
            </div>
            <span className="text-white font-semibold">PM Buddy</span>
          </div>

          <div className="flex items-center gap-2 text-red-500 text-sm">
            <div className={`w-3 h-3 bg-red-500 rounded-full ${isListening ? 'animate-pulse' : ''}`} />
            <span>REC {formatElapsedTime(timeElapsed)}</span>
          </div>
        </div>

        {/* Right: End Session */}
        <div className="flex items-center gap-3">
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
        <div className="flex-1 relative flex items-center justify-center p-6 bg-[#0B1020]">

          {/* Question Card - Top Left */}
          <div className="absolute top-6 left-6 max-w-md z-10 animate-fade-in-up">
            <div className="bg-[#1A2942] border border-slate-700/50 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-cyan-400 text-xs font-medium tracking-wide">INITIAL CASE</span>
                <button className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center hover:bg-slate-600/50 transition-colors">
                  <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="2" />
                  </svg>
                </button>
              </div>
              <p className="text-white text-sm leading-relaxed">
                {question}
              </p>
            </div>
          </div>

          {/* Listening Indicator - Top Right */}
          {(isListening || avatarState === 'listening') && !privateNote.trim() && (
            <div className="absolute top-6 right-6 z-10 animate-fade-in text-sans">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl backdrop-blur-sm">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-cyan-400 rounded-full animate-musical-bar" />
                  <div className="w-1 h-3 bg-cyan-400 rounded-full animate-musical-bar" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-3 bg-cyan-400 rounded-full animate-musical-bar" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-cyan-300 text-sm font-medium">Listening...</span>
              </div>
            </div>
          )}

          {/* Avatar - Centered */}
          <div className="relative flex items-center justify-center w-full h-full max-h-[85vh]">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent z-10" />

            <img
              src={avatarImage}
              alt="AI Interviewer"
              className={`max-h-full w-auto object-contain rounded-2xl border-2 border-white/5 shadow-2xl backdrop-blur-sm transition-transform duration-700 ease-in-out ${avatarState === 'talking' ? 'scale-105' : 'scale-100'}`}
            />

            {/* Waveform overlay when speaking */}
            {isSpeaking && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
                <div className="flex items-end gap-1 h-8">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-cyan-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-30">
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCameraOn
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              title="Toggle Camera"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              onClick={handleToggleMic}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isListening
                ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/50 scale-110'
                : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/30'
                }`}
            >
              {isListening ? (
                <svg className="w-7 h-7 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              )}
            </button>

            {isListening && (
              <button
                onClick={handleToggleMic}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center gap-2 animate-fade-in"
              >
                <span>Done Speaking</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>

          {/* User PIP */}
          {isCameraOn && (
            <div className="absolute bottom-8 left-8 w-48 h-36 bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl z-20">
              <div className="w-full h-full bg-slate-800 relative flex items-center justify-center">
                <span className="text-4xl">👨‍💻</span>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] text-white font-medium">YOU</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Transcript Panel */}
        <div className="w-[400px] bg-[#172635] border-l border-slate-700/50 flex flex-col z-20 shadow-xl">

          {/* Header */}
          <div className="h-16 border-b border-slate-700/50 flex items-center justify-between px-5 bg-[#172635]">
            <h3 className="text-white font-medium">Transcript</h3>
            <button className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm">
              Export
            </button>
          </div>

          {/* Messages */}
          <div
            ref={transcriptScrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar"
            style={{ minHeight: 0 }}
          >
            {/* Welcome Message */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                  <img src={avatarImage} alt="Interviewer" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm text-slate-300">Interviewer</span>
              </div>
              <div className="text-sm leading-relaxed text-slate-300 pl-8">
                Hello! I'm your AI interviewer for this session. We'll be focusing on {ROUND_NAMES[roundType || 'product-sense']}.
              </div>
            </div>

            {conversation.map((msg) => (
              <div key={msg.id} className="space-y-2 animate-fade-in">
                {/* Label with avatar */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                    <div className={`w-1.5 h-1.5 rounded-full ${isMicOn ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      {isMicOn ? 'Mic Active' : 'Mic Muted'}
                    </span>
                  </div>
                </div>
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
                <div className={`text-sm leading-relaxed ${msg.role === 'interviewer'
                  ? 'text-slate-300 pl-8'
                  : 'text-white bg-[#1E3A52] rounded-lg p-3 ml-8'
                  }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Listening indicator in transcript */}
            {isListening && (
              <div className="space-y-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-medium">
                    Y
                  </div>
                  <span className="text-sm text-cyan-300">You</span>
                </div>
                <div className="text-sm text-slate-400 italic pl-8 font-sans">
                  {privateNote.trim() ? 'Typing your logic...' : 'Listening to your response...'}
                </div>
              </div>
            )}

            {/* AI generating indicator */}
            {isAIResponding && (
              <div className="space-y-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                    <img src={avatarImage} alt="Interviewer" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm text-slate-300">Interviewer</span>
                </div>
                <div className="text-sm text-slate-400 italic pl-8">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Private Note Input (actually sends a message now) */}
          <div className="border-t border-slate-700/50 p-4 bg-[#172635]">
            <div className="relative">
              <input
                type="text"
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="w-full bg-[#1A2942] border border-slate-700/50 rounded-lg px-4 py-3 pr-12 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors"
                disabled={!privateNote.trim()}
              >
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
            <div className="bg-[#1A2942] border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white mb-3 text-center text-xl font-bold">End Interview?</h3>
              <p className="text-slate-400 mb-6 text-center leading-relaxed">
                Your performance will be analyzed and you'll receive detailed insights with coaching feedback.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors font-medium border border-slate-600"
                >
                  Continue Interview
                </button>
                <button
                  onClick={handleEndInterview}
                  className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20 font-medium"
                >
                  Get Insights
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* API Error Dismissible Modal */}
      {apiError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setApiError(null)} />
          <div className="relative bg-[#1A2942] border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-white mb-2 text-center text-xl font-bold">API Warning</h3>
            <p className="text-slate-300 mb-6 text-center leading-relaxed">
              {apiError}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setApiError(null)}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-400 transition-colors font-medium shadow-lg shadow-red-500/20"
              >
                Dismiss Warning
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors font-medium border border-slate-600"
              >
                Update API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}