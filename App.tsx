import React, { useState, useCallback, useEffect } from 'react';
import { Review, TestSuggestions, ApiLogEntry, PrContext, ReviewImprovement } from './types';
import { parseGitHubUrl, sha1, parseDiffToValidLineRanges } from './utils/helpers';
import { githubService } from './services/githubService';
import { geminiService } from './services/geminiService';
import { Spinner, ErrorDisplay, ReviewDisplay, TestSuggestionsDisplay, LogViewerModal, CopilotPromptModal } from './components/ui';
import Settings from './components/Settings';
import { Rocket, Search, Beaker, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [prUrl, setPrUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const [review, setReview] = useState<Review | null>(null);
  const [testSuggestions, setTestSuggestions] = useState<TestSuggestions | null>(null);
  const [prContext, setPrContext] = useState<PrContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showCopilotModal, setShowCopilotModal] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [masterFilesContent, setMasterFilesContent] = useState('');
  const [isGeneratingPromptFor, setIsGeneratingPromptFor] = useState<string | null>(null);
  const [isGeneratingTestPromptFor, setIsGeneratingTestPromptFor] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    const geminiKey = localStorage.getItem('GEMINI_API_KEY');
    const githubKey = localStorage.getItem('GITHUB_API_KEY');
    if (!geminiKey || !githubKey) {
      setShowSettings(true);
    }
  }, []);


  const logApiInteraction = useCallback((entry: ApiLogEntry) => {
    setApiLogs(prevLogs => [...prevLogs, entry]);
  }, []);

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    setReview(null);
    setTestSuggestions(null);
    setPrContext(null);
    setApiLogs([]);
    setMasterFilesContent('');


    try {
      const prData = parseGitHubUrl(prUrl);
      if (!prData) throw new Error("Invalid GitHub PR URL. Please use the format: https://github.com/owner/repo/pull/123");

      setLoadingStep('Fetching PR data...');
      const { prDetails, diff } = await githubService.getPrData(prData);
      const { title, body, base } = prDetails;

      setLoadingStep('Fetching repository context...');
      const readmeContent = await githubService.getReadmeContent(prData.owner, prData.repo, base.ref);
      const filesContent = await githubService.getChangedFilesContent(diff, prData.owner, prData.repo, base.ref);
      setMasterFilesContent(filesContent);

      setLoadingStep('Context gathering...');
      const { review: aiReview, contextSummary } = await geminiService.generateReview(title, body ?? '', diff, readmeContent, filesContent, (entry) => {
          logApiInteraction(entry);
          setLoadingStep(entry.step === 'Context Gathering' ? 'Performing initial analysis...' : 'Refining review...');
      }, selectedModel);
      
      setLoadingStep('Validating review...');
      const changedLineRanges = parseDiffToValidLineRanges(diff);
      const validImprovements = aiReview.improvements.filter(item => {
        const fileRanges = changedLineRanges[item.file];
        if (!fileRanges) {
          console.warn(`[Review Filter] Discarding suggestion for file not in diff: ${item.file}`);
          return false;
        }
        const isInRange = fileRanges.some(range => item.line >= range.start && item.line <= range.end);
        if (!isInRange) {
          console.warn(`[Review Filter] Discarding suggestion for line ${item.line} in file ${item.file} as it is outside changed hunks.`);
        }
        return isInRange;
      });

      const validReview = { ...aiReview, improvements: validImprovements };
      
      setPrContext({ summary: contextSummary, diff });
      
      setLoadingStep('Finalizing links...');
      const linkedImprovements = await Promise.all(
          validReview.improvements.map(async (item) => ({ 
              ...item, 
              link: `https://github.com/${prData.owner}/${prData.repo}/pull/${prData.pull_number}/files#diff-${await sha1(item.file)}R${item.line}` 
          }))
      );
      
      const finalReview = { ...validReview, improvements: linkedImprovements };
      setReview(finalReview);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };
  
  const handleSuggestTests = async () => {
    if (!prContext) {
      setError("Please perform a review first to gather context for test generation.");
      return;
    }
    setLoading(true);
    setLoadingStep('Generating test cases...');
    setError(null);
    setTestSuggestions(null);

    try {
        const suggestions = await geminiService.generateTestSuggestions(
            prContext.summary, 
            prContext.diff, 
            logApiInteraction,
            selectedModel
        );
        setTestSuggestions(suggestions);
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to generate test suggestions.');
    } finally {
        setLoading(false);
        setLoadingStep('');
    }
  };

  const handleGenerateCopilotPrompt = async (improvement: ReviewImprovement, key: string) => {
    setIsGeneratingPromptFor(key);
    setError(null);
    try {
      const fileBlockRegex = new RegExp(`--- File: ${improvement.file} ---\n([\\s\\S]*?)(?=\n--- File:|$)`);
      const match = masterFilesContent.match(fileBlockRegex);

      if (!match || !match[1]) {
          throw new Error(`Could not find content for file: ${improvement.file}`);
      }

      const fileContent = match[1];
      const lines = fileContent.split('\n');
      const lineIndex = improvement.line - 1;
      
      const contextLines = 5;
      const start = Math.max(0, lineIndex - contextLines);
      const end = Math.min(lines.length, lineIndex + contextLines + 1);

      const codeSnippet = lines.slice(start, end).join('\n');

      const generatedPrompt = await geminiService.generateCopilotFixPrompt(
        improvement,
        codeSnippet,
        logApiInteraction,
        selectedModel
      );

      setCopilotPrompt(generatedPrompt);
      setShowCopilotModal(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate Copilot prompt.');
    } finally {
      setIsGeneratingPromptFor(null);
    }
  };

  const handleGenerateTestPrompt = async (suggestion: string, category: string, key: string) => {
    setIsGeneratingTestPromptFor(key);
    setError(null);

    if (!prContext) {
      setError("PR context is not available. Please run a review first.");
      setIsGeneratingTestPromptFor(null);
      return;
    }

    try {
      const generatedPrompt = await geminiService.generateTestCreationPrompt(
        suggestion,
        category,
        prContext.summary,
        prContext.diff,
        logApiInteraction,
        selectedModel
      );

      setCopilotPrompt(generatedPrompt);
      setShowCopilotModal(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate test creation prompt.');
    } finally {
      setIsGeneratingTestPromptFor(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center">
            <Rocket className="mr-3 h-9 w-9" />
            Advanced AI Code Reviewer
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">Multi-step analysis with self-critique powered by Gemini.</p>
          <div className="absolute top-4 right-4">
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-gray-200">
              <SettingsIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </header>

        <div className="bg-card border p-6 rounded-lg mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="text" value={prUrl} onChange={(e) => setPrUrl(e.target.value)} placeholder="Paste GitHub PR link here..." className="h-10 flex-grow bg-background text-foreground placeholder:text-muted-foreground px-3 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background" />
            
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="h-10 flex-shrink-0 sm:w-48 bg-background text-foreground px-3 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Select AI Model"
            >
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
             <button onClick={handleReview} disabled={loading} className="sm:col-span-2 h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 rounded-md transition-all duration-300 disabled:bg-secondary disabled:text-secondary-foreground/50 disabled:cursor-not-allowed flex items-center justify-center">
              {loading && loadingStep !== 'Generating test cases...' ? <Spinner text={loadingStep || 'Initializing...'} /> : <><Search className="mr-2 h-4 w-4" /> Perform Deep Review</>}
            </button>
            <button onClick={handleSuggestTests} disabled={loading || !review} className="h-10 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold px-6 rounded-md transition-all duration-300 disabled:bg-secondary disabled:text-secondary-foreground/50 disabled:cursor-not-allowed flex items-center justify-center">
               {loading && loadingStep === 'Generating test cases...' ? <Spinner text={loadingStep} /> : <><Beaker className="mr-2 h-4 w-4" /> Suggest Test Cases</>}
            </button>
           </div>
           <div className="flex justify-end items-center mt-2">
             {apiLogs.length > 0 && !loading && <button onClick={() => setShowLogs(true)} className="text-xs text-muted-foreground hover:text-foreground underline">View API Logs</button>}
           </div>
        </div>
        
        {error && <ErrorDisplay message={error} />}

        {review && <ReviewDisplay review={review} onGenerateCopilotPrompt={handleGenerateCopilotPrompt} isGeneratingPromptFor={isGeneratingPromptFor} />}
        
        {testSuggestions && (
          <TestSuggestionsDisplay 
            suggestions={testSuggestions}
            onGenerateTestPrompt={handleGenerateTestPrompt}
            isGeneratingPromptFor={isGeneratingTestPromptFor} 
          />
        )}

        {showLogs && <LogViewerModal logs={apiLogs} onClose={() => setShowLogs(false)} />}
        {showCopilotModal && <CopilotPromptModal prompt={copilotPrompt} onClose={() => setShowCopilotModal(false)} />}
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      </div>
    </div>
  );
}