interface InterviewerPanelProps {
  question: string;
  roundType: string;
  timeElapsed: number;
}

const ROUND_LABELS: { [key: string]: string } = {
  'product-sense': 'Product Sense',
  'rca': 'Root Cause Analysis',
  'metrics': 'Metrics & Experimentation',
  'prioritization': 'Prioritization',
  'technical': 'Technical',
  'strategy': 'Strategy',
  'behavioral': 'Behavioral'
};

export default function InterviewerPanel({ question, roundType, timeElapsed }: InterviewerPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-full">
      {/* Interviewer avatar */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
        </div>
        <div>
          <p className="text-slate-900">AI Interviewer</p>
          <p className="text-slate-600">{ROUND_LABELS[roundType] || 'Mock Interview'}</p>
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 mb-6">
        <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-indigo-900 mb-2">Your Question</p>
              <p className="text-indigo-950 text-lg leading-relaxed">{question}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Repeat Question
        </button>
        
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Give 1 Hint (Free)
        </button>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Next question locked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
