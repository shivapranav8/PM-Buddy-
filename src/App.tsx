import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/auth/AuthScreen';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import Home from './components/dashboard/Home';
import MockLibrary from './components/library/MockLibrary';
import LiveInterview from './components/interview/LiveInterview';
import InsightsScreen from './components/insights/InsightsScreen';
import ProgressScreen from './components/progress/ProgressScreen';
import SettingsScreen from './components/settings/SettingsScreen';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Session {
  id: string;
  date: string;
  roundType: string;
  score: number;
  difficulty: string;
  transcript: string;
  insights: SessionInsights;
}

export interface SessionInsights {
  scores: { [key: string]: number };
  strengths: string[];
  improvements: string[];
  timeline: TimelineEvent[];
  actual_root_cause?: string;
}

export interface TimelineEvent {
  timestamp: string;
  type: 'strong' | 'missed' | 'neutral';
  text: string;
}

export interface UserPreferences {
  apiKey: string;
  targetCompanies: string[];
  level: string;
  focusAreas: string[];
  customRound: string;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Check for existing session data (prefs, onboarding)
  // We sync onboarding status with Firestore
  useEffect(() => {
    const savedOnboarding = localStorage.getItem('pm-mock-onboarding');
    const savedPreferences = localStorage.getItem('pm-mock-preferences');
    const savedSessions = localStorage.getItem('pm-mock-sessions');

    if (savedOnboarding === 'complete') {
      setHasCompletedOnboarding(true);
    }
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }

    // Check Firestore for onboarding status if user is logged in
    const checkFirestoreOnboarding = async () => {
      if (user) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');

          // 1. Get User Doc (Onboarding + General Prefs)
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();

            if (userData.onboardingCompleted) {
              setHasCompletedOnboarding(true);
              localStorage.setItem('pm-mock-onboarding', 'complete');

              // 2. Get API Key from Settings Subcollection
              let apiKey = '';
              try {
                const apiSettingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'openai'));
                if (apiSettingsDoc.exists()) {
                  apiKey = apiSettingsDoc.data().apiKey || '';
                }
              } catch (e) {
                console.warn('Could not fetch API key settings', e);
              }

              // 3. Construct Preferences Object
              if (userData.preferences) {
                const loadedPreferences: UserPreferences = {
                  ...userData.preferences,
                  apiKey: apiKey // Merge API key
                };
                setPreferences(loadedPreferences);
                localStorage.setItem('pm-mock-preferences', JSON.stringify(loadedPreferences));
                console.log('Restored preferences from Firestore', loadedPreferences);
              }
            }
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        }
      }
    };

    checkFirestoreOnboarding();
  }, [user]);

  const handleCompleteOnboarding = async (prefs: UserPreferences) => {
    setHasCompletedOnboarding(true);
    setPreferences(prefs);
    localStorage.setItem('pm-mock-onboarding', 'complete');
    localStorage.setItem('pm-mock-preferences', JSON.stringify(prefs));

    // Save API Key and Onboarding Status to Firestore
    if (user) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');

        // Save settings
        if (prefs.apiKey) {
          await setDoc(doc(db, 'users', user.uid, 'settings', 'openai'), {
            apiKey: prefs.apiKey,
            updatedAt: new Date().toISOString()
          });
        }

        // Save onboarding status
        await setDoc(doc(db, 'users', user.uid), {
          onboardingCompleted: true,
          preferences: {
            targetCompanies: prefs.targetCompanies,
            level: prefs.level,
            focusAreas: prefs.focusAreas,
            customRound: prefs.customRound
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log('Onboarding status saved to Firestore');
      } catch (error) {
        console.error('Error saving to Firestore:', error);
      }
    }
  };

  const handleAddSession = (session: Session) => {
    const newSessions = [session, ...sessions];
    setSessions(newSessions);
    localStorage.setItem('pm-mock-sessions', JSON.stringify(newSessions));
  };

  const handleLogout = () => {
    // AuthContext handles the actual logout from Firebase
    // We just clear local app state
    setHasCompletedOnboarding(false);
    setPreferences(null);
    setSessions([]);
    localStorage.clear();
  };

  const handleUpdatePreferences = async (prefs: UserPreferences) => {
    console.log('handleUpdatePreferences called', { hasUser: !!user, hasApiKey: !!prefs.apiKey });
    setPreferences(prefs);
    localStorage.setItem('pm-mock-preferences', JSON.stringify(prefs));

    // Update API Key in Firestore if changed
    if (user && prefs.apiKey) {
      try {
        console.log('Attempting to save API key to Firestore for user:', user.uid);
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        await setDoc(doc(db, 'users', user.uid, 'settings', 'openai'), {
          apiKey: prefs.apiKey,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('API Key updated in Firestore successfully');
      } catch (error) {
        console.error('Error updating API Key in Firestore:', error);
        throw error; // Re-throw to let UI know it failed
      }
    } else {
      console.warn('Skipping Firestore write: User or API Key missing', { user: !!user, apiKey: !!prefs.apiKey });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  // Map Firebase user to App User type if needed, or just pass the Firebase user
  // For now, we'll cast or adapt as needed. The components expect a 'User' object.
  const appUser: User | null = user ? {
    id: user.uid,
    name: user.displayName || 'User',
    email: user.email || '',
    avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
  } : null;

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          appUser ? <Navigate to="/onboarding" /> : <AuthScreen />
        }
      />
      <Route
        path="/onboarding"
        element={
          !appUser ? <Navigate to="/auth" /> :
            hasCompletedOnboarding ? <Navigate to="/library" /> :
              <OnboardingFlow onComplete={handleCompleteOnboarding} />
        }
      />
      <Route
        path="/home"
        element={
          !appUser || !hasCompletedOnboarding ? <Navigate to="/auth" /> :
            <Home user={appUser} sessions={sessions} onLogout={handleLogout} />
        }
      />
      <Route
        path="/library"
        element={
          !appUser || !hasCompletedOnboarding ? <Navigate to="/auth" /> :
            <MockLibrary user={appUser} onLogout={handleLogout} />
        }
      />
      <Route
        path="/interview/:roundType"
        element={
          !appUser || !hasCompletedOnboarding ? <Navigate to="/auth" /> :
            <LiveInterview user={appUser} onComplete={handleAddSession} />
        }
      />
      <Route
        path="/insights/:sessionId"
        element={
          !appUser || !hasCompletedOnboarding ? <Navigate to="/auth" /> :
            <InsightsScreen user={appUser} sessions={sessions} />
        }
      />
      <Route
        path="/progress"
        element={
          !appUser || !hasCompletedOnboarding ? <Navigate to="/auth" /> :
            <ProgressScreen user={appUser} sessions={sessions} onLogout={handleLogout} />
        }
      />
      <Route
        path="/settings"
        element={
          !appUser || !hasCompletedOnboarding ? <Navigate to="/auth" /> :
            <SettingsScreen
              user={appUser}
              preferences={preferences}
              onUpdatePreferences={handleUpdatePreferences}
              onLogout={handleLogout}
            />
        }
      />
      <Route path="/" element={<Navigate to="/auth" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;