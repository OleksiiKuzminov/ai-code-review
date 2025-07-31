# AI Code Reviewer

This project is a web-based AI Code Reviewer application. It allows users to input a GitHub Pull Request URL and get a comprehensive code review powered by the Gemini API.
[site](https://oleksiikuzminov.github.io/ai-code-review/)

## Features

-   **In-depth Code Analysis:** Performs a multi-step review of your pull request, identifying strengths and areas for improvement.
-   **Test Case Suggestions:** Generates suggestions for unit, integration, and end-to-end tests.
-   **AI Assistant Prompts:** Creates prompts to help you fix issues or write tests with AI coding assistants like GitHub Copilot.
-   **User-Friendly Interface:** A clean and intuitive UI for a smooth experience.

## How to Run Locally

**Prerequisites:**

-   Node.js
-   npm (or a compatible package manager)

**Steps:**

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Set up API Keys:**

    You can provide your API keys in one of two ways:

    *   **Environment Variables:** Create a `.env.local` file in the root of the project and add your keys:

        ```
        GEMINI_API_KEY=your_gemini_api_key
        GITHUB_API_KEY=your_github_pat
        ```

    *   **Settings UI:** Launch the application and open the settings page to add your keys directly in the user interface.

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).
