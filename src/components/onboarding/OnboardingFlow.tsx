import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPreferences } from '../../App';
import OnboardingWelcome from './OnboardingWelcome';
import OnboardingAPIKey from './OnboardingAPIKey';
import OnboardingPreferences from './OnboardingPreferences';

interface OnboardingFlowProps {
  onComplete: (preferences: UserPreferences) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
  const navigate = useNavigate();

  const handleWelcomeNext = () => {
    setStep(2);
  };

  const handleAPIKeyNext = (apiKey: string) => {
    setPreferences({ ...preferences, apiKey });
    setStep(3);
  };

  const handlePreferencesComplete = (prefs: { targetCompanies: string[], level: string, focusAreas: string[], customRound: string }) => {
    const finalPreferences: UserPreferences = {
      apiKey: preferences.apiKey || '',
      ...prefs
    };
    onComplete(finalPreferences);
    navigate('/library');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {step === 1 && <OnboardingWelcome onNext={handleWelcomeNext} />}
      {step === 2 && <OnboardingAPIKey onNext={handleAPIKeyNext} onBack={() => setStep(1)} />}
      {step === 3 && <OnboardingPreferences onComplete={handlePreferencesComplete} onBack={() => setStep(2)} />}
    </div>
  );
}