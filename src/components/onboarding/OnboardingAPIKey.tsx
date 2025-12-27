import { useState } from 'react';

interface OnboardingAPIKeyProps {
  onNext: (apiKey: string) => void;
  onBack: () => void;
}

export default function OnboardingAPIKey({ onNext, onBack }: OnboardingAPIKeyProps) {
  const [apiKey, setApiKey] = useState('');
  const [isTestig, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    // Simulate API test
    setTimeout(() => {
      // Mock validation - accept if starts with "sk-"
      if (apiKey.startsWith('sk-')) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
      setIsTesting(false);
    }, 1500);
  };

  const handleContinue = () => {
    if (apiKey.trim()) {
      onNext(apiKey);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-24 h-1.5 bg-indigo-600 rounded-full" />
            <div className="w-24 h-1.5 bg-indigo-600 rounded-full" />
            <div className="w-24 h-1.5 bg-slate-200 rounded-full" />
          </div>
          <p className="text-center text-slate-500">Step 2 of 3</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-100 shadow-xl">
          <div className="mb-8">
            <h2 className="text-slate-900 mb-3">Connect your OpenAI API Key</h2>
            <p className="text-slate-600">
              We use OpenAI's GPT models to generate realistic interview questions and provide feedback. Your key is stored securely on your device only.
            </p>
          </div>

          {/* API Key input */}
          <div className="mb-6">
            <label htmlFor="apiKey" className="block text-slate-700 mb-2">
              OpenAI API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="sk-..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-2 text-slate-500">
              Don't have one? Get it from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                OpenAI's platform
              </a>
            </p>
          </div>

          {/* Test connection button */}
          <button
            onClick={handleTestConnection}
            disabled={!apiKey.trim() || isTestig}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestig ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                <span>Testing connection...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Test Connection</span>
              </>
            )}
          </button>

          {/* Test result */}
          {testResult === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-900">Connection successful!</p>
                <p className="text-green-700">Your API key is valid and ready to use.</p>
              </div>
            </div>
          )}

          {testResult === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-red-900">Connection failed</p>
                <p className="text-red-700">Please check your API key and try again.</p>
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-indigo-900 mb-1">Your data stays private</p>
                <p className="text-indigo-700">
                  We never send your API key to our servers. It's stored locally in your browser and used only to make direct requests to OpenAI. You can update or remove it anytime in Settings.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleContinue}
              disabled={!apiKey.trim()}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
