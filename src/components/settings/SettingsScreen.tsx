import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserPreferences } from '../../App';
import Navigation from '../common/Navigation';

interface SettingsScreenProps {
  user: User;
  preferences: UserPreferences | null;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  onLogout: () => void;
}

export default function SettingsScreen({ user, preferences, onUpdatePreferences, onLogout }: SettingsScreenProps) {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState(preferences?.apiKey || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    console.log('SettingsScreen: handleSave called');

    if (!apiKey.trim().startsWith('sk-')) {
      alert("Invalid API Key. It must start with 'sk-'. Please check your key.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      console.log('SettingsScreen: Checking preferences object', { preferences, apiKey });
      if (preferences) {
        console.log('SettingsScreen: Calling onUpdatePreferences');
        await onUpdatePreferences({
          ...preferences,
          apiKey
        });
        console.log('SettingsScreen: onUpdatePreferences completed');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error('SettingsScreen: Preferences object is null/undefined');
        alert("Error: User preferences not loaded. Please try reloading the page.");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation user={user} currentPage="settings" onLogout={onLogout} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage your account and preferences</p>
        </div>

        {/* User profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-slate-900 mb-4">Profile</h3>
          <div className="flex items-center gap-4">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-full"
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
              }}
            />
            <div>
              <p className="text-slate-900">{user.name}</p>
              <p className="text-slate-600">{user.email}</p>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-slate-900 mb-4">OpenAI API Key</h3>
          <p className="text-slate-600 mb-4">
            Your API key is stored securely on your device and used only for generating interview questions and feedback.
          </p>

          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-slate-700 mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || !apiKey.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>

            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Saved successfully!</span>
              </div>
            )}
          </div>
        </div>

        {/* Interview preferences */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-slate-900 mb-4">Interview Preferences</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 mb-2">Default Interview Length</label>
              <select
                defaultValue="45 minutes"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>60 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-2">Voice Speed</label>
              <select
                defaultValue="Normal"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option>Slow</option>
                <option>Normal</option>
                <option>Fast</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-2">Interviewer Accent</label>
              <select
                defaultValue="US English"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option>US English</option>
                <option>UK English</option>
                <option>Australian English</option>
                <option>Indian English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-slate-900 mb-4">Privacy & Data</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-900 mb-1">Your data stays local</p>
                  <p className="text-blue-800">
                    All interview data, transcripts, and API keys are stored only in your browser's local storage. We never send your personal data to our servers.
                  </p>
                </div>
              </div>
            </div>

            <button className="w-full px-4 py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All Local Data
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border-2 border-red-200 p-6">
          <h3 className="text-red-900 mb-4">Danger Zone</h3>
          <p className="text-slate-600 mb-4">
            Once you log out, all your local data will be cleared from this browser.
          </p>
          <button
            onClick={onLogout}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
