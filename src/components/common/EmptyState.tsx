import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl text-slate-400 mb-6">
        {icon}
      </div>
      <h3 className="text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
