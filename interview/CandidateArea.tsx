interface CandidateAreaProps {
  isRecording: boolean;
  transcript: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  roundType: string;
}

const NOTES_TEMPLATES: { [key: string]: string } = {
  'product-sense': `# Clarifying Questions
- 

# User Segments
- 

# Solutions
1. 
2. 
3. 

# Prioritization
- 

# Success Metrics
- `,
  'rca': `# Context & Metric
- 

# Hypotheses
1. 
2. 
3. 

# Investigation Plan
- 

# Root Cause
- 

# Next Steps
- `,
  'metrics': `# Goal
- 

# Key Metrics
- North Star: 
- Success: 
- Guardrail: 

# Experiment Design
- 

# Analysis Plan
- `,
  'prioritization': `# Options
1. 
2. 
3. 

# Framework
- Impact: 
- Effort: 
- Strategic Fit: 

# Decision
- 

# Tradeoffs
- `,
  'technical': `# System Components
- 

# Data Flow
1. 
2. 
3. 

# Technical Considerations
- 

# Tradeoffs
- `,
  'strategy': `# Market Context
- 

# Strategic Options
1. 
2. 
3. 

# Evaluation Criteria
- 

# Recommendation
- 

# Risks
- `,
  'behavioral': `# Situation
- 

# Task
- 

# Action
- 

# Result
- 

# Learnings
- `
};

export default function CandidateArea({ 
  isRecording, 
  transcript, 
  notes, 
  onNotesChange, 
  onStartRecording, 
  onStopRecording,
  roundType 
}: CandidateAreaProps) {
  
  const loadTemplate = () => {
    onNotesChange(NOTES_TEMPLATES[roundType] || NOTES_TEMPLATES['product-sense']);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-full">
      <h3 className="text-slate-900 mb-4">Your Response</h3>

      {/* Mic button */}
      <div className="mb-6 flex flex-col items-center">
        <button
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50 animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/50'
          }`}
        >
          {isRecording ? (
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        <p className="mt-3 text-slate-600">
          {isRecording ? 'Recording... Click to stop' : 'Click to start speaking'}
        </p>
      </div>

      {/* Waveform visualization */}
      {isRecording && (
        <div className="mb-6 flex items-center justify-center gap-1 h-12">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-indigo-600 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Live transcript */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-700">Live Transcript</label>
          {transcript && (
            <button className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Bookmark moment
            </button>
          )}
        </div>
        <div className="h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto">
          {transcript ? (
            <p className="text-slate-700 leading-relaxed">{transcript}</p>
          ) : (
            <p className="text-slate-400 italic">Your speech will appear here in real-time...</p>
          )}
        </div>
      </div>

      {/* Notes scratchpad */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-700">Notes & Structure</label>
          <button
            onClick={loadTemplate}
            className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Load template
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Jot down your thoughts, structure your answer, or load a template..."
          className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
        />
      </div>
    </div>
  );
}
