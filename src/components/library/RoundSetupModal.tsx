import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../common/Footer';

interface RoundSetupModalProps {
  round: {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    iconColor: string;
  };
  onClose: () => void;
}

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', description: 'Simpler scope with more guidance' },
  { id: 'medium', label: 'Medium', description: 'Standard interview difficulty' },
  { id: 'hard', label: 'Hard', description: 'Complex, open-ended scenarios' }
];

export default function RoundSetupModal({ round, onClose }: RoundSetupModalProps) {
  const [difficulty, setDifficulty] = useState('medium');
  const navigate = useNavigate();

  const availableDifficulties = round.id === 'product-sense'
    ? DIFFICULTIES.filter(d => d.id !== 'hard')
    : DIFFICULTIES;

  const handleStart = () => {
    // Store configuration in sessionStorage
    sessionStorage.setItem('interview-config', JSON.stringify({
      roundType: round.id,
      difficulty,
      voiceEnabled: true
    }));

    navigate(`/interview/${round.id}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${round.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-6 h-6 ${round.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={round.icon} />
                  </svg>
                </div>
                <div>
                  <h2 className="text-slate-900">{round.title}</h2>
                  <p className="text-slate-600">{round.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Difficulty */}
            <div>
              <label className="block text-slate-900 mb-4">
                Select Difficulty Level
              </label>
              <div className="grid gap-3">
                {availableDifficulties.map(diff => (
                  <button
                    key={diff.id}
                    onClick={() => setDifficulty(diff.id)}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${difficulty === diff.id
                      ? 'bg-indigo-50 border-indigo-600 shadow-md'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-900 mb-1">{diff.label}</p>
                        <p className="text-slate-600">{diff.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${difficulty === diff.id
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300'
                        }`}>
                        {difficulty === diff.id && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-indigo-900 mb-1">Voice-based Interview · ~45 minutes</p>
                  <p className="text-indigo-700">
                    The AI interviewer will engage with you naturally. You can ask questions and have a conversation just like a real interview.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
              >
                Start Interview →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
