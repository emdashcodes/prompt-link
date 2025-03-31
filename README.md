# VS Code MCP Prompts Extension

This extension adds support for Model Context Protocol (MCP) prompts to VS Code, enabling you to use MCP prompts with AI tools like Cursor and RooCode. It acts as a bridge, allowing these tools to work with MCP prompts even though they don't natively support them. The extension provides a seamless way to insert structured prompts into your AI-assisted development workflow.

## Features

- Support for multiple MCP servers
- Direct integration with RooCode and Cursor
- Automatic polling for prompt updates
- Configurable keyboard shortcuts

## Requirements

- Visual Studio Code version 1.85.0 or higher
- (Optional) RooCode extension for direct context insertion
- (Optional) Cursor extension for direct chat integration

## Installation

1. Install the extension from the VS Code marketplace
2. Configure the path to your MCP server (see Configuration section)
3. (Optional) Install RooCode and/or Cursor

## Configuration

This extension connects to one or more MCP servers defined in your VS Code settings using the `mcpPrompts.servers` property. This property is an array, where each object in the array defines a connection to a single MCP server.

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

- `mcpPrompts.pollingInterval`: Number of seconds between automatic prompt refreshes. Defaults to 300 seconds (5 minutes) if not set or invalid.

```json
{
  "mcpPrompts.servers": [
    {
      "name": "Local Node Server",
      "path": "node", // Path to the node executable
      "args": [
        "/Users/me/dev/my-mcp-server/dist/index.js", // Path to the script is the first arg
        "--port", // Argument for the script
        "8080"    // Value for the script argument
      ],
      "env": {
        "PROMPT_FOLDER": "/Users/me/dev/my-prompts"
      }
    },
  ],
  "mcpPrompts.pollingInterval": 300  // Refresh prompts every 5 minutes
}
```

You can customize the keyboard shortcuts in your `keybindings.json` file. For example:

```json
{
  "key": "ctrl+shift+a",
  "command": "mcp-prompts.insertPrompt"
}
```

Configure these settings in your User or Workspace `settings.json` file.

## Usage

1. Press the configured keyboard shortcut (default: `Cmd+Shift+A` on Mac, `Ctrl+Shift+A` on Windows/Linux) to open the prompt selector
2. Select a prompt from the list. Prompts are prefixed with the server name (e.g., `[Server Name]: Prompt Name`).
3. If the prompt has parameters, enter them when prompted
4. Choose where to send the prompt:
   - RooCode: Adds the prompt to RooCode's context (if installed)
   - Cursor: Opens the prompt in Cursor's chat (if installed)
   - Clipboard: Copies the prompt for manual pasting

You can also:

- Use the command palette and search for "MCP: Insert Prompt"
- Use the command palette and search for "MCP: Refresh Prompts" to refresh the list of available prompts from all connected servers.

## Commands

- `MCP: Insert Prompt` - Open the prompt selector
- `MCP: Refresh Prompts` - Refresh the list of available prompts

## Keyboard Shortcuts

- Default: `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Windows/Linux) - Open the prompt selector
- Customizable through VS Code's keyboard shortcuts settings

## Extension Settings

This extension contributes the following settings:

- `mcpPrompts.servers`: An array of MCP server configurations. See the [Configuration](#configuration) section for details.
- `mcpPrompts.pollingInterval`: Number of seconds between automatic prompt refreshes (default: 300 seconds / 5 minutes).

## Development

To build and test the extension:

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run compile
   ```

4. Press F5 in VS Code to launch a new window with the extension loaded
5. Use the test server in the `test` directory for development

## Release Notes

### 0.1.0

Initial release:

- Connect to one or more MCP servers defined in VS Code settings.
- Lists available prompts from all connected servers.
- Execute the `MCP: Insert Prompt` command (via command palette or keyboard shortcut) to open the prompt selector.
- Handle prompts with required or optional arguments, prompting the user for input.
- Send the final prompt content to:
  - RooCode context (if installed).
  - Cursor chat (if installed).
  - System clipboard.
- Execute the `MCP: Refresh Prompts` command to manually update the prompt list.
- Automatically refresh prompts in the background based on the `mcpPrompts.pollingInterval` setting.
- Configure server connections using `mcpPrompts.servers` (including path, args, env).
- Default keyboard shortcut: `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Windows/Linux).
