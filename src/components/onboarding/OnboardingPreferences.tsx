import { useState } from 'react';

interface OnboardingPreferencesProps {
  onComplete: (preferences: { targetCompanies: string[], level: string, focusAreas: string[], customRound: string }) => void;
  onBack: () => void;
}

const COMPANIES = [
  'Google', 'Meta', 'Amazon', 'Apple', 'Microsoft',
  'Netflix', 'Airbnb', 'Uber', 'Stripe', 'Shopify'
];

const LEVELS = [
  { id: 'apm', label: 'APM / Associate PM', description: '0-2 years' },
  { id: 'pm', label: 'PM / Product Manager', description: '2-5 years' },
  { id: 'spm', label: 'Senior PM', description: '5+ years' }
];

const INTERVIEW_ROUNDS = [
  { id: 'product-sense', label: 'Product Improvement' },
  { id: 'rca', label: 'Root Cause Analysis' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'guesstimates', label: 'Guesstimates' },
  { id: 'technical', label: 'Product Design' },
  { id: 'strategy', label: 'Product Strategy' }
];

export default function OnboardingPreferences({ onComplete, onBack }: OnboardingPreferencesProps) {
  const [step, setStep] = useState(1);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [level, setLevel] = useState('pm');
  const [focusAreas, setFocusAreas] = useState<string[]>(INTERVIEW_ROUNDS.map(a => a.id));
  const [customRound, setCustomRound] = useState('');

  const toggleCompany = (company: string) => {
    setTargetCompanies(prev =>
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  const toggleFocusArea = (areaId: string) => {
    setFocusAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(a => a !== areaId)
        : [...prev, areaId]
    );
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({ targetCompanies, level, focusAreas, customRound });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-3xl w-full">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-24 h-1.5 bg-indigo-600 rounded-full" />
            <div className="w-24 h-1.5 bg-indigo-600 rounded-full" />
            <div className={`w-24 h-1.5 rounded-full transition-colors ${step === 1 ? 'bg-indigo-300' : step === 2 ? 'bg-indigo-400' : 'bg-indigo-600'}`} />
          </div>
          <p className="text-center text-slate-500">Step 3 of 3 · Quick Survey</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200 shadow-xl animate-slide-up">
          {/* Step 1: Target Companies */}
          {step === 1 && (
            <div>
              <div className="mb-8">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-slate-900 mb-3">Which companies are you targeting?</h2>
                <p className="text-slate-600">
                  Select all companies you're preparing for. This helps us tailor interview scenarios to match their styles.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {COMPANIES.map(company => (
                  <button
                    key={company}
                    onClick={() => toggleCompany(company)}
                    className={`px-5 py-3 rounded-xl border-2 transition-all ${targetCompanies.includes(company)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                  >
                    {company}
                  </button>
                ))}
              </div>

              <p className="text-slate-500 mt-6 text-center">
                {targetCompanies.length === 0 ? 'Select at least one company, or skip to continue' : `${targetCompanies.length} selected`}
              </p>
            </div>
          )}

          {/* Step 2: Experience Level */}
          {step === 2 && (
            <div>
              <div className="mb-8">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-slate-900 mb-3">What's your experience level?</h2>
                <p className="text-slate-600">
                  We'll adjust interview difficulty and expectations to match your career stage.
                </p>
              </div>

              <div className="grid gap-4">
                {LEVELS.map(lvl => (
                  <button
                    key={lvl.id}
                    onClick={() => setLevel(lvl.id)}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${level === lvl.id
                      ? 'bg-indigo-50 border-indigo-600 shadow-md'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-900 mb-1">{lvl.label}</p>
                        <p className="text-slate-600">{lvl.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${level === lvl.id
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300'
                        }`}>
                        {level === lvl.id && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Focus Areas */}
          {step === 3 && (
            <div>
              <div className="mb-8">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h2 className="text-slate-900 mb-3">Which interview rounds do you want to practice?</h2>
                <p className="text-slate-600">
                  Select all the rounds you'd like to focus on. These are the most common PM interview types.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mb-6">
                {INTERVIEW_ROUNDS.map(round => (
                  <button
                    key={round.id}
                    onClick={() => toggleFocusArea(round.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${focusAreas.includes(round.id)
                      ? 'bg-indigo-50 border-indigo-600'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${focusAreas.includes(round.id)
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300'
                        }`}>
                        {focusAreas.includes(round.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-slate-900">{round.label}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Round Input */}
              <div className="p-5 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                <label className="block text-slate-900 mb-2">
                  Other round you want to practice?
                </label>
                <input
                  type="text"
                  value={customRound}
                  onChange={(e) => setCustomRound(e.target.value)}
                  placeholder="e.g., Market Sizing, Estimation, Case Study..."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
                <p className="text-slate-500 mt-2">
                  Let us know if there's a specific interview type you'd like to practice that's not listed above.
                </p>
              </div>

              <p className="text-slate-500 mt-6 text-center">
                {focusAreas.length === 0 ? 'Select at least one round to continue' : `${focusAreas.length} rounds selected`}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-10">
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              disabled={step === 3 && focusAreas.length === 0}
              className={`flex-1 px-6 py-3 rounded-xl transition-all ${step === 3 && focusAreas.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'
                }`}
            >
              {step < 3 ? 'Next →' : 'Start Practicing →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}