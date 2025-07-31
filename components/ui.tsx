import React, { useState, useMemo } from 'react';
import { ApiLogEntry, Review, TestSuggestions, ReviewImprovement } from '../types';
import { Loader2, Check, Wand2, X, Shield, Zap, Paintbrush, Target, Wrench, BookOpen, AlertTriangle, FlaskConical, Hand, TestTubes, ChevronDown, ChevronRight } from 'lucide-react';

export const Spinner: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center">
    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" />
    <span>{text}</span>
  </div>
);

export const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-destructive/10 border border-destructive/30 text-foreground p-4 rounded-lg relative mb-8" role="alert">
    <strong className="font-semibold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

const FormattedTextRenderer: React.FC<{ text: string; }> = ({ text }) => {
  if (!text) return null;
  // Regex to split by `backticks`
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code key={i} className="bg-secondary px-1.5 py-0.5 rounded-sm font-mono text-sm text-foreground relative">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        )
      )}
    </>
  );
};

interface ReviewDisplayProps {
  review: Review;
  onGenerateCopilotPrompt: (improvement: ReviewImprovement, key: string) => void;
  isGeneratingPromptFor: string | null;
}

const categoryIcons: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  Security: Shield,
  Performance: Zap,
  Style: Paintbrush,
  Correctness: Target,
  Maintainability: Wrench,
  Readability: BookOpen,
};
const DefaultIcon = AlertTriangle;


export const ReviewDisplay: React.FC<ReviewDisplayProps> = ({ review, onGenerateCopilotPrompt, isGeneratingPromptFor }) => {
  const groupedImprovements = useMemo(() => {
    if (!review.improvements) return {};
    return review.improvements.reduce((acc, item) => {
      const category = item.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ReviewImprovement[]>);
  }, [review.improvements]);

  return (
    <div className="border bg-card text-card-foreground rounded-lg mb-8">
      <div className="p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Gemini Review Summary</h2>
      </div>
      <div className="p-6 pt-0 space-y-6">
        {review.strengths?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Strengths</h3>
            <ul className="space-y-3">
              {review.strengths.map((item, index) => (
                <li key={`strength-${index}`} className="border bg-secondary/20 p-4 rounded-md flex items-start gap-3">
                  <Check className="h-5 w-5 text-foreground/80 mt-1 flex-shrink-0" />
                  <p className="text-sm text-foreground/90 leading-relaxed"><FormattedTextRenderer text={item} /></p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(groupedImprovements).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Areas for Improvement</h3>
            <div className="space-y-6">
              {Object.entries(groupedImprovements).map(([category, items]) => {
                const Icon = categoryIcons[category] || DefaultIcon;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                      <h4 className="text-md font-semibold text-foreground">{category}</h4>
                    </div>
                    <ul className="space-y-3 border-l-2 border-secondary ml-[10px] pl-[22px]">
                      {items.map((item, index) => {
                        const itemKey = `${category}-${index}`;
                        const isGenerating = isGeneratingPromptFor === itemKey;
                        return (
                          <li key={itemKey} className="border bg-secondary/20 p-4 rounded-md flex flex-col gap-3">
                              <div className="flex justify-end items-center">
                                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">{item.file} (line {item.line})</a>
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed">
                                <FormattedTextRenderer text={item.comment} />
                              </p>
                              <button
                                onClick={() => onGenerateCopilotPrompt(item, itemKey)}
                                disabled={isGenerating}
                                className="self-start mt-2 h-8 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold px-3 rounded-md transition-all duration-200 flex items-center gap-2 disabled:bg-secondary/50 disabled:cursor-wait"
                                aria-label={`Generate Copilot prompt for ${item.file} line ${item.line}`}
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    <span>Generating...</span>
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="h-4 w-4" />
                                    <span>Generate Fix Prompt</span>
                                  </>
                                )}
                              </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TestSuggestionsDisplayProps {
  suggestions: TestSuggestions;
  onGenerateTestPrompt: (suggestion: string, category: string, key: string) => void;
  isGeneratingPromptFor: string | null;
}

const testCategoryConfig = {
    unitTests: {
        title: 'Unit Tests',
        Icon: FlaskConical,
        category: 'Unit Test',
    },
    integrationTests: {
        title: 'Integration Tests',
        Icon: TestTubes,
        category: 'Integration Test',
    },
    manualChecks: {
        title: 'Manual E2E Checks',
        Icon: Hand,
        category: 'Manual E2E Check',
    }
};

export const TestSuggestionsDisplay: React.FC<TestSuggestionsDisplayProps> = ({ suggestions, onGenerateTestPrompt, isGeneratingPromptFor }) => {
  const testCategories = [
    { key: 'unitTests', data: suggestions.unitTests },
    { key: 'integrationTests', data: suggestions.integrationTests },
    { key: 'manualChecks', data: suggestions.manualChecks },
  ];

  const hasSuggestions = testCategories.some(c => c.data && c.data.length > 0);

  if (!hasSuggestions) return null;

  return (
    <div className="border bg-card text-card-foreground rounded-lg mb-8">
      <div className="p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Test Case Suggestions</h2>
      </div>
      <div className="p-6 pt-0 space-y-6">
        {testCategories.map(({ key, data }) => {
            if (!data || data.length === 0) return null;
            
            const config = testCategoryConfig[key as keyof typeof testCategoryConfig];
            const { title, Icon, category } = config;

            return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="h-5 w-5 text-foreground/80 flex-shrink-0" />
                    <h4 className="text-md font-semibold text-foreground">{title}</h4>
                  </div>
                  <ul className="space-y-3 border-l-2 border-secondary ml-[10px] pl-[22px]">
                    {data.map((test, index) => {
                      const itemKey = `${category}-${index}`;
                      const isGenerating = isGeneratingPromptFor === itemKey;
                      return (
                        <li key={itemKey} className="border bg-secondary/20 p-4 rounded-md flex flex-col gap-3">
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              <FormattedTextRenderer text={test} />
                            </p>
                            <button
                              onClick={() => onGenerateTestPrompt(test, category, itemKey)}
                              disabled={isGenerating}
                              className="self-start mt-2 h-8 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold px-3 rounded-md transition-all duration-200 flex items-center gap-2 disabled:bg-secondary/50 disabled:cursor-wait"
                              aria-label={`Generate prompt for this test case`}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="animate-spin h-4 w-4" />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="h-4 w-4" />
                                  <span>Generate Test Prompt</span>
                                </>
                              )}
                            </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export const LogViewerModal: React.FC<{ logs: ApiLogEntry[], onClose: () => void }> = ({ logs, onClose }) => {
    const [openIndices, setOpenIndices] = useState<Set<number>>(new Set([0]));

    const toggleLogEntry = (index: number) => {
        setOpenIndices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-lg font-semibold">API Interaction Logs</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-md p-1 -m-1">
                      <X className="h-5 w-5" />
                      <span className="sr-only">Close</span>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {logs.map((log, index) => {
                        const isOpen = openIndices.has(index);
                        return (
                            <div key={index} className="mb-2 border rounded-lg bg-secondary/20">
                                <button
                                    onClick={() => toggleLogEntry(index)}
                                    className="w-full flex justify-between items-center p-3 bg-secondary/50 rounded-t-lg text-left hover:bg-secondary transition-colors"
                                    aria-expanded={isOpen}
                                >
                                    <div className="flex items-center">
                                        {isOpen ? <ChevronDown className="h-5 w-5 mr-3 flex-shrink-0" /> : <ChevronRight className="h-5 w-5 mr-3 flex-shrink-0" />}
                                        <div>
                                            <h3 className="font-semibold text-foreground">Step {index + 1}: {log.step}</h3>
                                            <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </button>
                                {isOpen && (
                                    <div className="p-4 space-y-4 border-t border-secondary">
                                        <div>
                                            <h4 className="font-semibold text-muted-foreground mb-2">Prompt Sent:</h4>
                                            <pre className="bg-background p-3 rounded-md text-sm text-foreground/80 overflow-x-auto whitespace-pre-wrap border"><code>{log.prompt}</code></pre>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-muted-foreground mb-2">Response Received:</h4>
                                            <pre className="bg-background p-3 rounded-md text-sm text-foreground/80 overflow-x-auto whitespace-pre-wrap border"><code>{JSON.stringify(log.response, null, 2)}</code></pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export const CopilotPromptModal: React.FC<{ prompt: string, onClose: () => void }> = ({ prompt, onClose }) => {
    const [copied, setCopied] = useState(false);

    const [mainPrompt, contextBlock] = useMemo(() => {
        const separator = '\n\n---\n**Context for the fix:**';
        const testSeparator = '\n\n---\n**Context for the test:**';
        const finalSeparator = prompt.includes(separator) ? separator : testSeparator;
        
        const parts = prompt.split(finalSeparator);
        const context = parts.length > 1 ? `---${parts[1]}` : '';
        return [parts[0].trim(), context.trim()];
    }, [prompt]);

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-lg font-semibold">Generated Fix Prompt</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded-md p-1 -m-1">
                      <X className="h-5 w-5" />
                      <span className="sr-only">Close</span>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <h3 className="text-base font-semibold text-muted-foreground mb-2">Prompt for AI Assistant</h3>
                        <div className="bg-secondary/50 p-4 rounded-md text-sm text-foreground/90 border border-input">
                            <p className="leading-relaxed"><FormattedTextRenderer text={mainPrompt} /></p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Copy this prompt and paste it into GitHub Copilot Chat or a similar tool.</p>
                    </div>
                    {contextBlock && (
                        <div>
                            <h3 className="text-base font-semibold text-muted-foreground mb-2">Context Used</h3>
                             <pre className="bg-secondary/50 p-4 rounded-md text-xs text-foreground/80 overflow-x-auto whitespace-pre-wrap border"><code>{contextBlock}</code></pre>
                        </div>
                    )}
                </div>
                <div className="flex justify-end items-center p-4 border-t mt-auto bg-card">
                    <button onClick={handleCopy} className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2 px-4 rounded-md transition-all duration-300 w-32">
                        {copied ? 'Copied!' : 'Copy Prompt'}
                    </button>
                </div>
            </div>
        </div>
    );
};