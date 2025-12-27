import { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: ReactNode;
}

export default function ErrorState({ 
  title = 'Something went wrong', 
  message,
  action 
}: ErrorStateProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl text-red-600 mb-6">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-red-900 mb-2">{title}</h3>
      <p className="text-red-800 mb-6 max-w-md mx-auto">
        {message}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
