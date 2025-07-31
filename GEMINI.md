# AI Code Reviewer

## Project Overview

This project is a web-based AI Code Reviewer application. It allows users to input a GitHub Pull Request URL, and the application will perform an in-depth code review. The application uses the Gemini API to perform a multi-step analysis of the PR, including a self-critique mechanism, to provide high-quality feedback, identify strengths, and suggest areas for improvement. It also offers functionality to generate test case suggestions and create prompts for AI coding assistants like GitHub Copilot to fix identified issues or create new tests.

The frontend is built with **React** and **TypeScript**, using **Vite** as a build tool. The UI is styled with **Tailwind CSS** and includes custom components for displaying reviews, test suggestions, API logs, and generated prompts. The application interacts with the GitHub API to fetch PR details, diffs, and file contents, and with the Gemini API for the AI-powered analysis.

## Core Functionality

- **PR Analysis:** Takes a GitHub PR URL to fetch the necessary data.
- **AI-Powered Review:** Uses the Gemini API to perform a multi-step review process:
    1.  **Context Gathering:** Summarizes the PR's goal, project context, and key changes.
    2.  **Initial Review:** Generates an initial set of strengths and improvements based on the context and diff.
    3.  **Reflection and Refinement:** Critiques the initial review to produce a more accurate and in-depth final review.
- **Test Suggestions:** Generates unit tests, integration tests, and manual E2E checks based on the PR's context and changes.
- **Copilot Prompt Generation:** Creates prompts for AI assistants to fix identified issues or implement test suggestions.
- **UI Components:** Provides a user-friendly interface to interact with the application, including:
    -   Input field for the PR URL.
    -   Buttons to trigger the review and test suggestion processes.
    -   Displays for the review summary, strengths, and improvements, categorized for clarity.
    -   Modals for viewing API interaction logs and generated Copilot prompts.
- **Settings:** A settings page to configure API keys (Gemini and GitHub) and test the connection.

## Project Structure

```
/
├─── .env.local              # Local environment variables (API keys)
├─── .gitignore              # Git ignore file
├─── App.tsx                 # Main React application component
├─── index.html              # Main HTML file
├─── index.tsx               # React entry point
├─── package.json            # NPM package configuration
├─── README.md               # Project README
├─── tsconfig.json           # TypeScript configuration
├─── types.ts                # TypeScript type definitions
├─── vite.config.ts          # Vite configuration
├─── components/
│    ├─── Settings.tsx       # Settings page component
│    └─── ui.tsx              # UI components (Spinner, ErrorDisplay, etc.)
├─── services/
│    ├─── geminiService.ts    # Service for interacting with the Gemini API
│    └─── githubService.ts    # Service for interacting with the GitHub API
└─── utils/
     └─── helpers.ts          # Helper functions (URL parsing, hashing, etc.)
```

## How to Run

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add your API keys, or add them via the settings page in the UI:
    ```
    GEMINI_API_KEY=your_gemini_api_key
    GITHUB_API_KEY=your_github_pat
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Key Files and Components

-   **`App.tsx`**: The main application component that manages state, handles user interactions, and orchestrates the API calls.
-   **`geminiService.ts`**: Contains the logic for interacting with the Gemini API, including the multi-step review process and test suggestion generation.
-   **`githubService.ts`**: Handles all communication with the GitHub API, such as fetching PR details, diffs, and file contents.
-   **`components/ui.tsx`**: A collection of reusable React components that make up the user interface.
-   **`components/Settings.tsx`**: The settings page component, allowing users to configure API keys and test the connection.
-   **`utils/helpers.ts`**: Provides utility functions for parsing GitHub URLs, calculating SHA-1 hashes, and parsing diffs.
-   **`types.ts`**: Defines the TypeScript types and interfaces used throughout the application.