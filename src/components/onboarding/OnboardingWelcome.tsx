interface OnboardingWelcomeProps {
  onNext: () => void;
}

export default function OnboardingWelcome({ onNext }: OnboardingWelcomeProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-24 h-1.5 bg-indigo-600 rounded-full" />
            <div className="w-24 h-1.5 bg-slate-200 rounded-full" />
            <div className="w-24 h-1.5 bg-slate-200 rounded-full" />
          </div>
          <p className="text-center text-slate-500">Step 1 of 3</p>
        </div>

        {/* Welcome content */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl mb-8 shadow-lg">
            <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-slate-900 mb-4">
            Welcome to PM Buddy
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto text-lg">
            Get interview-ready with realistic PM mocks. Practice all 7 core interview rounds, get AI-powered feedback, and track your progress.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-slate-900 mb-2">Voice-First Practice</h3>
            <p className="text-slate-600">
              Speak naturally. Real-time transcript captures your thinking.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-slate-900 mb-2">Smart Insights</h3>
            <p className="text-slate-600">
              Detailed rubrics show exactly what to improve.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-slate-900 mb-2">7 Core Rounds</h3>
            <p className="text-slate-600">
              Product Improvement, Metrics, Product Strategy, Behavioral & more.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onNext}
            className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
          >
            Start Setup →
          </button>
        </div>
      </div>
    </div>
  );
}
