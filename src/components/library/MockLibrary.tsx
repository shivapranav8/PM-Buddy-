import { useState } from 'react';
import { User } from '../../App';
import Navigation from '../common/Navigation';
import RoundTile from './RoundTile';
import RoundSetupModal from './RoundSetupModal';
import Footer from '../common/Footer';

interface MockLibraryProps {
  user: User;
  onLogout: () => void;
}

const MOCK_ROUNDS = [
  {
    id: 'product-sense',
    title: 'Product Improvement',
    description: 'Improve an existing product to solve a specific user pain point.',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    color: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    id: 'rca',
    title: 'Root Cause Analysis',
    description: 'Diagnose why a metric dropped or investigate a product problem.',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    color: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    id: 'metrics',
    title: 'Metrics',
    description: 'Define success metrics, design experiments, or analyze A/B test results.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    color: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    id: 'guesstimates',
    title: 'Guesstimates',
    description: 'Estimate market size, revenue potential, or other ambiguous numbers.',
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    color: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  {
    id: 'technical',
    title: 'Product Design',
    description: 'Design a new product or feature for a specific user segment.',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    color: 'bg-red-100',
    iconColor: 'text-red-600'
  },
  {
    id: 'strategy',
    title: 'Product Strategy',
    description: 'Define long-term vision, competitive strategy, and market positioning.',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    color: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  },
];

export default function MockLibrary({ user, onLogout }: MockLibraryProps) {
  const [selectedRound, setSelectedRound] = useState<typeof MOCK_ROUNDS[0] | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation user={user} currentPage="library" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-slate-900 mb-2">Mock Library</h1>
          <p className="text-slate-600">
            Pick a round to practice. Think out loud. We'll handle the rest.
          </p>
        </div>

        {/* Grid of rounds */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_ROUNDS.map(round => (
            <RoundTile
              key={round.id}
              round={round}
              onSelect={() => setSelectedRound(round)}
            />
          ))}
        </div>

        <Footer />
      </div>

      {/* Setup modal */}
      {selectedRound && (
        <RoundSetupModal
          round={selectedRound}
          onClose={() => setSelectedRound(null)}
        />
      )}
    </div>
  );
}
