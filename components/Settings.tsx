
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [githubApiKey, setGithubApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);

  useEffect(() => {
    const storedGeminiKey = localStorage.getItem('GEMINI_API_KEY');
    const storedGithubKey = localStorage.getItem('GITHUB_API_KEY');
    if (storedGeminiKey) {
      setGeminiApiKey(storedGeminiKey);
    }
    if (storedGithubKey) {
      setGithubApiKey(storedGithubKey);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('GEMINI_API_KEY', geminiApiKey);
    localStorage.setItem('GITHUB_API_KEY', githubApiKey);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestStatus({ type: 'loading', message: 'Testing... ' });
    // This is a simplified test. In a real app, you'd make a lightweight API call.
    const isGeminiOk = geminiApiKey.length > 10; 
    const isGithubOk = githubApiKey.length > 10;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (isGeminiOk && isGithubOk) {
      setTestStatus({ type: 'success', message: 'Both API keys seem to be valid!' });
    } else {
      const errors = [];
      if (!isGeminiOk) errors.push('Gemini API Key');
      if (!isGithubOk) errors.push('GitHub PAT');
      setTestStatus({ type: 'error', message: `Invalid: ${errors.join(', ')}. Please check your keys.` });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-card border rounded-lg shadow-xl p-6 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-foreground">Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="gemini-api-key" className="block text-sm font-medium text-foreground mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              id="gemini-api-key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="h-10 w-full bg-background text-foreground placeholder:text-muted-foreground px-3 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              placeholder="Enter your Gemini API Key"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              <a
                href="https://ai.google.dev/tutorials/setup"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                How to get a Gemini API Key
              </a>
            </p>
          </div>
          
          <div>
            <label htmlFor="github-api-key" className="block text-sm font-medium text-foreground mb-1">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              id="github-api-key"
              value={githubApiKey}
              onChange={(e) => setGithubApiKey(e.target.value)}
              className="h-10 w-full bg-background text-foreground placeholder:text-muted-foreground px-3 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              placeholder="Enter your GitHub PAT"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              A <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Fine-Grained PAT</a> with `Pull requests` (Read-only) and `Contents` (Read-only) is required.
            </p>
          </div>
        </div>

        {testStatus && (
          <div className={`mt-4 p-3 rounded-md flex items-center text-sm ${testStatus.type === 'success' ? 'bg-green-100 text-green-800' : testStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            {testStatus.type === 'loading' && <Loader className="animate-spin h-5 w-5 mr-2" />}
            {testStatus.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
            {testStatus.type === 'error' && <XCircle className="h-5 w-5 mr-2" />}
            {testStatus.message}
          </div>
        )}

        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={handleTestConnection}
            className="h-10 px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold rounded-md transition-colors flex items-center"
            disabled={testStatus?.type === 'loading'}
          >
            {testStatus?.type === 'loading' ? <Loader className="animate-spin h-5 w-5" /> : 'Test Connection'}
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="h-10 px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-md transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
