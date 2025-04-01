# Contributing & Development Instructions

PromptLink is a VS Code extension designed to bridge the gap between the Model Context Protocol (MCP) and popular AI coding assistants like Cursor, RooCode, and GitHub Copilot. It allows users to leverage their MCP prompts seamlessly within their existing VS Code workflows, even if the target tool doesn't have native MCP support.

We welcome contributions of all kinds, from bug fixes and documentation improvements to new features like additional integrations (e.g., Cline or other things you may use), internationalization, and adding a robust test suite. If you're interested in helping enhance PromptLink, please review the guidelines below.

## Pull Requests

1. **Fork & Branch:** Fork the repository and create a new branch from `main` for your changes (e.g., `git checkout -b feat/your-feature-name`).
2. **Code Quality:** Write clean, maintainable code. Please ensure your code passes linting checks (run `npm run lint`).
3. **Testing:** While the project currently lacks extensive tests (see Future Enhancements in README), please manually test your changes and provide instructions in your Pull Request! Contributions adding automated tests are highly encouraged! I'll get to it soon :).
4. **Documentation:** Update the `README.md` or other relevant documentation if your changes impact installation, configuration, or usage.
5. **Commit Messages:** Write clear, concise commit messages describing the changes.
6. **Keep it Focused:** Submit one pull request per feature or bug fix.
7. **PR Description:** Provide a clear description of the problem you're solving and the changes you've made in the pull request body. Provide testing instructions.
8. **Rebase:** Keep your branch updated with the `main` branch by rebasing (`git pull --rebase upstream main`).

## Git Recommendations

- Work on feature branches based off the `main` branch.
- Use descriptive branch names (e.g., `fix/clipboard-issue`, `feat/add-new-integration`).
- Keep your commit history clean and focused. Rebase interactively (`git rebase -i`) to squash or reword commits if necessary before submitting a PR.
- Follow Conventional Commits for your commit messages if possible.

## Development

To build and test the extension:

1. Clone the repository: `git clone https://github.com/emdashcodes/prompt-link.git`
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run compile
   ```

4. Press F5 in VS Code to launch a new window with the extension loaded

## Contribution Areas

Based on the project's current state and future goals (see `README.md`), here are some areas where contributions would be particularly valuable:

- **New Integrations:** Adding support for more AI tools (e.g., Cline or other things you use).
- **Testing:** Building out a comprehensive test suite (unit, integration tests). I focused on an MVP, so there are no tests yet.
- **Internationalization (i18n):** Making the extension translatable into other languages. I want this extension to be accessible to everyone.
- **Bug Fixes & Enhancements:** Addressing existing issues or improving current functionality.
- **Documentation:** Improving setup instructions, usage examples, etc.
