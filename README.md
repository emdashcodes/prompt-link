# PromptLink - MCP Prompt Integration for VS Code

This extension adds support for [Model Context Protocol (MCP) prompts](https://modelcontextprotocol.io/docs/concepts/prompts) to VS Code, enabling you to use MCP prompts with AI tools like Cursor, RooCode, and GitHub Copilot. It acts as a bridge, allowing you to easily use MCP prompts in them even though they don't natively support them.

## Features

- Support for multiple MCP servers
- Direct integration with RooCode, Cursor, and GitHub Copilot
- Fallback to clipboard for everything else
- Automatic polling for prompt updates
- Configurable keyboard shortcuts

## Requirements

- Visual Studio Code version 1.85.0 or higher
- (Optional) RooCode extension for direct context insertion
- (Optional) Cursor extension for direct chat integration
- (Optional) GitHub Copilot extension for direct chat integration

## Installation

1. Install the extension from the VS Code marketplace or GitHub
2. Configure the path to your MCP server (see Configuration section)
3. (Optional) Install RooCode, Cursor, or GitHub Copilot

## Configuration

This extension connects to one or more MCP servers defined in your VS Code settings using the `promptLink.servers` property. This property is an array, where each object in the array defines a connection to a single MCP server.

Each server configuration object requires:

- `name`: A unique string to identify this server connection (e.g., "Local Prompts", "Perplexity Server"). This name will be shown in the prompt list.
- `path`: The command or file path to the **executable** used to run the MCP server.
  - For binary executables or directly executable scripts (e.g., shell scripts with a shebang), this is the path to the file.
  - For interpreted scripts (e.g., Node.js, Python), this should be the path to the interpreter (`node`, `python3`, etc.).

And optionally accepts:

- `args`: An array of strings representing command-line arguments.
  - If `path` is an interpreter (like `node`), the **first argument** in this array should typically be the path to the script file to execute. Subsequent elements are arguments passed *to that script*.
  - If `path` is a direct executable, these are the arguments passed *to that executable*.
- `env`: An object containing environment variables to set for the server process. These are merged with the system's environment variables.

Additionally, you can configure:

- `promptLink.pollingInterval`: Number of seconds between automatic prompt refreshes. Defaults to 300 seconds (5 minutes) if not set or invalid.

Example Server Configuration:

```json
{
  "promptLink.servers": [
    {
      "name": "Local Node Server",
      "path": "node",
      "args": [
        "/Users/me/dev/my-mcp-server/dist/index.js",
      ],
      "env": {
        "PROMPT_FOLDER": "/Users/me/dev/my-prompts"
      }
    },
  ],
}
```

You can customize the keyboard shortcuts in your `keybindings.json` file. For example:

```json
{
  "key": "ctrl+shift+a",
  "command": "prompt-link.insertPrompt"
}
```

Configure these settings in your User or Workspace `settings.json` file.

## Usage

1. Press the configured keyboard shortcut (default: `Cmd+Shift+A` on Mac, `Ctrl+Shift+A` on Windows/Linux) to open the prompt selector
2. Select a prompt from the list. Prompts are prefixed with the server name (e.g., `[Server Name]: Prompt Name`).
3. If the prompt has parameters, enter them when prompted
4. Choose where to send the prompt:
   - RooCode: Copies to your clipboard and opens RooCode (if installed)
   - Cursor: Copies to your clipboard and opens Cursor (if installed)
   - GitHub Copilot: Copies to your clipboard and opens Copilot (if installed)
   - Clipboard: Copies the prompt for manual pasting somewhere else

You can also:

- Use the command palette and search for "PromptLink: Insert Prompt"
- Use the command palette and search for "PromptLink: Refresh Prompts" to refresh the list of available prompts from all connected servers.

## Commands

- `PromptLink: Insert Prompt` - Open the prompt selector
- `PromptLink: Refresh Prompts` - Refresh the list of available prompts

## Keyboard Shortcuts

- Default: `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Windows/Linux) - Open the prompt selector
- Customizable through VS Code's keyboard shortcuts settings

## Extension Settings

This extension contributes the following settings:

- `promptLink.servers`: An array of MCP server configurations. See the [Configuration](#configuration) section for details.
- `promptLink.pollingInterval`: Number of seconds between automatic prompt refreshes (default: 300 seconds / 5 minutes).

## Future Enhancements

- Add more integrations
  - Cline
- Internationalization
- Tests

## Release Notes

See [CHANGELOG](CHANGELOG.md)

## Contributing & Development Instructions

See [CONTRIBUTING](CONTRIBUTING.md)
