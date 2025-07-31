
export interface PrData {
  owner: string;
  repo: string;
  pull_number: number;
}

export interface ReviewImprovement {
  line: number;
  file: string;
  category: string;
  comment: string;
  link?: string;
}

export interface Review {
  strengths: string[];
  improvements: ReviewImprovement[];
}

export interface TestSuggestions {
  unitTests?: string[];
  integrationTests?: string[];
  manualChecks?: string[];
}

export interface ApiLogEntry {
  step: string;
  prompt: string;
  response: unknown;
  timestamp: string;
}

export interface PrContext {
    summary: string;
    diff: string;
}
