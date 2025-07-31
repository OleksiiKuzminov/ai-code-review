import { GoogleGenAI, Type } from "@google/genai";
import { Review, TestSuggestions, ApiLogEntry, ReviewImprovement } from "../types";

const getGeminiApiKey = () => {
  const key = localStorage.getItem('GEMINI_API_KEY');
  // @ts-ignore
  return key || process.env.GEMINI_API_KEY || '';
};

const logInteraction = (
  logCallback: (entry: ApiLogEntry) => void, 
  step: string, 
  prompt: string, 
  response: unknown
) => {
  logCallback({ step, prompt, response, timestamp: new Date().toISOString() });
};

const jsonSchemaReview: any = {
    type: Type.OBJECT,
    properties: {
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      improvements: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            line: { type: Type.NUMBER, description: "The line number the comment refers to." },
            file: { type: Type.STRING, description: "The full path of the file being commented on." },
            category: { type: Type.STRING, description: "A category like 'Security', 'Performance', 'Style', 'Correctness'." },
            comment: { type: Type.STRING, description: "The detailed feedback for improvement. Use markdown for inline code using backticks (e.g., `variableName`)." },
          },
          required: ["line", "file", "category", "comment"]
        },
      },
    },
    required: ["strengths", "improvements"]
};

export const geminiService = {
  generateReview: async (
    title: string,
    body: string,
    diff: string,
    readmeContent: string,
    masterFilesContent: string,
    logCallback: (entry: ApiLogEntry) => void,
    model: string
  ): Promise<{ review: Review; contextSummary: string; }> => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("Gemini API Key not found. Please set it in the settings.");
    const ai = new GoogleGenAI({ apiKey });

    // --- Step 1: Context Gathering ---
    const contextPrompt = `
      **Act as a research assistant for a senior software engineer.**
      Your goal is to gather and summarize all possible context about a pull request to prepare for a deep code review.
      **Information to Synthesize:**
      1.  **PR Goal:** What is the primary purpose of this PR based on its title and description?
      2.  **Project Overview:** Based on the provided README.md and the code structure, what can you infer about the project's purpose, framework, and overall architecture?
      3.  **Existing Code Patterns:** Analyze the provided content of the original files from the master branch. What are the existing coding conventions, variable naming styles, and architectural patterns in this project?
      4.  **Key Changes:** Briefly list the core files and functions being modified based on the diff.
      **Output:** Provide a concise summary as a block of text. This summary will be fed into the next stage of the review process.
      ---
      **PR Title:** ${title}
      **PR Description:** ${body || 'No description provided.'}
      **README.md Content:**\n\`\`\`markdown\n${readmeContent}\n\`\`\`
      **Original Content of Changed Files (from master branch):**\n\`\`\`\n${masterFilesContent}\n\`\`\`
      **Code Diff:**\n\`\`\`diff\n${diff}\n\`\`\`
    `;
    const contextResponse = await ai.models.generateContent({ model, contents: contextPrompt });
    const contextSummary = contextResponse.text;
    logInteraction(logCallback, 'Context Gathering', contextPrompt, contextSummary);

    // --- Step 2: Initial Code Review ---
    const initialPrompt = `
      **Act as a Lead Software Engineer performing a code review.**
      Your Goal is to provide a solid, initial code review based on the provided context.
      Focus on issues related to **Security, Performance, Correctness, and Maintainability**.
      You **must** respond with a valid JSON object that adheres to the provided schema. For comments, use markdown for inline code using backticks (e.g., \`variableName\`).
      
      **CRITICAL INSTRUCTION:** All of your 'improvements' **must** refer to a line number that is part of the additions or surrounding context within the provided diff. Do not suggest changes for any code that falls outside the hunks in the diff.

      **Project & PR Context:**\n${contextSummary}
      **Code Diff to Review:**\n\`\`\`diff\n${diff}\n\`\`\`
    `;
    const initialResponse = await ai.models.generateContent({
      model,
      contents: initialPrompt,
      config: { responseMimeType: "application/json", responseSchema: jsonSchemaReview }
    });
    const initialReviewText = initialResponse.text;
    logInteraction(logCallback, 'Initial Review', initialPrompt, initialReviewText);

    // --- Step 3: Reflection and Refinement ---
    const refinementPrompt = `
      **Act as a meticulous Principal Engineer, responsible for ensuring the absolute highest quality of code reviews.**
      Your Task is to critique an initial code review and produce a final, improved version.
      **Critique Process (Reflection Self-Critique Loop):**
      1.  **Re-evaluate the Goal:** Does the initial review fully address the PR's purpose based on the provided context?
      2.  **Identify Flaws:** Was the initial review too generic? Did it miss any subtle bugs, edge cases, or potential security vulnerabilities? Crucially, did it suggest improvements for code *outside* the provided diff?
      3.  **Deepen the Analysis:** Are the suggestions truly actionable and do they follow the absolute best practices?
      4.  **Refine the Output:** Produce a final, polished version of the review. It must be more accurate, in-depth, and helpful.

      **CRITICAL INSTRUCTION:** Ensure every single improvement suggestion in the final JSON output refers *directly* to a line number and file present in the original code diff. Discard any initial suggestions that comment on code outside the provided diff.

      **You must output only the final, refined JSON object.** Do not comment on the critique process itself. For comments, use markdown for inline code using backticks (e.g., \`variableName\`).
      **Full Context:**\n${contextSummary}
      **Initial Review to Critique:**\n\`\`\`json\n${initialReviewText}\n\`\`\`
      **Original Code Diff:**\n\`\`\`diff\n${diff}\n\`\`\`
    `;
    const finalResponse = await ai.models.generateContent({
      model,
      contents: refinementPrompt,
      config: { responseMimeType: "application/json", responseSchema: jsonSchemaReview }
    });
    const finalReviewText = finalResponse.text;
    logInteraction(logCallback, 'Refinement', refinementPrompt, finalReviewText);

    return { review: JSON.parse(finalReviewText), contextSummary };
  },

  generateTestSuggestions: async (
    contextSummary: string,
    diff: string,
    logCallback: (entry: ApiLogEntry) => void,
    model: string
  ): Promise<TestSuggestions> => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("Gemini API Key not found. Please set it in the settings.");
    const ai = new GoogleGenAI({ apiKey });

    const testPrompt = `
      **Act as a senior Quality Assurance (QA) Engineer.**
      Your task is to analyze the provided project context and code changes to propose a comprehensive set of test cases.
      **Instructions:**
      1.  Review the provided context and code diff to understand the changes.
      2.  Propose test cases to ensure the changes are robust, correct, and don't introduce regressions.
      3.  Categorize your suggestions into "unitTests", "integrationTests", and "manualChecks".
      4.  For each test case, provide a concise, clear description of the action to be performed and the expected outcome. Use markdown for inline code using backticks (e.g., \`variableName\`).
      **Output Format:** You **must** respond with a valid JSON object adhering to the schema.
      **Full Context:**\n${contextSummary}
      **Code Diff to Analyze:**\n\`\`\`diff\n${diff}\n\`\`\`
    `;
    const response = await ai.models.generateContent({
      model,
      contents: testPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            unitTests: { type: Type.ARRAY, items: { type: Type.STRING } },
            integrationTests: { type: Type.ARRAY, items: { type: Type.STRING } },
            manualChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });
    const suggestionsText = response.text;
    logInteraction(logCallback, 'Test Suggestions', testPrompt, suggestionsText);
    return JSON.parse(suggestionsText);
  },

  generateCopilotFixPrompt: async (
    improvement: ReviewImprovement,
    codeSnippet: string,
    logCallback: (entry: ApiLogEntry) => void,
    model: string
  ): Promise<string> => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("Gemini API Key not found. Please set it in the settings.");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      You are an expert software engineer reviewing code. Your task is to generate a precise and actionable prompt for an AI coding assistant like GitHub Copilot.

      The user has identified an issue and needs a prompt to give to the AI to fix it.

      Based on the review comment, category, and the relevant code snippet below, create a prompt that clearly explains what needs to be changed. The generated prompt should be self-contained and provide all necessary context for the AI assistant to produce the corrected code.

      **Output only the text for the prompt, and nothing else.**

      ---
      **Code Review Details:**
      - **File:** \`${improvement.file}\`
      - **Line:** ${improvement.line}
      - **Category:** ${improvement.category}
      - **Suggestion:** ${improvement.comment}

      **Relevant Code Snippet:**
      \`\`\`
      ${codeSnippet}
      \`\`\`
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const aiGeneratedPrompt = response.text;
    logInteraction(logCallback, 'Generate Copilot Prompt', prompt, aiGeneratedPrompt);

    const finalPromptForUser = `
${aiGeneratedPrompt}

---
**Context for the fix:**

**Code Review Details:**
- **File:** \`${improvement.file}\`
- **Line:** ${improvement.line}
- **Category:** ${improvement.category}
- **Suggestion:** ${improvement.comment}

**Relevant Code Snippet:**
\`\`\`
${codeSnippet}
\`\`\`
`.trim();

    return finalPromptForUser;
  },

  generateTestCreationPrompt: async (
    testSuggestion: string,
    category: string,
    contextSummary: string,
    diff: string,
    logCallback: (entry: ApiLogEntry) => void,
    model: string
  ): Promise<string> => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error("Gemini API Key not found. Please set it in the settings.");
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are an expert Quality Assurance engineer. Your task is to generate a precise and actionable prompt for an AI coding assistant (like GitHub Copilot) to create a specific test case.

      The user has a test suggestion and needs a prompt to give to the AI to implement it.

      Based on the suggested test, its category, the overall PR context, and the code changes, create a prompt that clearly explains what test needs to be written. The generated prompt should be self-contained and provide all necessary context for the AI assistant to produce the correct test code. It should specify where to add the test if possible.

      **Output only the text for the prompt, and nothing else.**

      ---
      **Test Case Details:**
      - **Category:** ${category}
      - **Suggestion:** ${testSuggestion}

      **Overall PR Context:**
      ${contextSummary}

      **Code Diff:**
      \`\`\`diff\n${diff}\n\`\`\`
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const aiGeneratedPrompt = response.text;
    logInteraction(logCallback, 'Generate Test Creation Prompt', prompt, aiGeneratedPrompt);

    const finalPromptForUser = `
${aiGeneratedPrompt}

---
**Context for the test:**

**Test to create:**
- **Category:** ${category}
- **Suggestion:** ${testSuggestion}

**Pull Request Summary:**
${contextSummary}
`.trim();
    
    return finalPromptForUser;
  }
};