interface RoundTileProps {
  round: {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    iconColor: string;
  };
  onSelect: () => void;
}

export default function RoundTile({ round, onSelect }: RoundTileProps) {
  return (
    <button
      onClick={onSelect}
      className="group bg-white border-2 border-slate-200 hover:border-indigo-300 rounded-2xl p-6 text-left transition-all hover:shadow-lg"
    >
      {/* Icon */}
      <div className={`w-14 h-14 ${round.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <svg className={`w-7 h-7 ${round.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={round.icon} />
        </svg>
      </div>

      {/* Content */}
      <h3 className="text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
        {round.title}
      </h3>
      <p className="text-slate-600 mb-4">
        {round.description}
      </p>

      {/* CTA */}
      <div className="flex items-center gap-2 text-indigo-600 group-hover:gap-3 transition-all">
        <span>Start practice</span>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    </button>
  );
}
