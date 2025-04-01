# Changelog

## 1.0.4 - 2025-04-01

- Updated configuration to use `command` instead of `path` (to be more consistent with other client configurations).

## 1.0.3 - 2025-04-01

- Added extension icon.

## 1.0.2 - 2025-04-01

- Changed prompt refresh notification to only appear on extension startup, not on every background poll. Manual refresh still shows a notification.

## 1.0.1 - 2025-04-01

- Initial Public Release
- Listed in extension marketplace
- Updated documentation (`README.md`, `CONTRIBUTING.md`).

## 1.0.0 - 2025-03-31

- Initial Public Release
- Connects to one or more MCP servers defined in VS Code settings.
- Lists available prompts from all connected servers.
- Execute the `PromptLink: Insert Prompt` command (via command palette or keyboard shortcut) to open the prompt selector.
- Handle prompts with required or optional arguments, prompting the user for input.
- Send the final prompt content to:
  - RooCode context (if installed).
  - Cursor chat (if installed).
  - System clipboard.
- Execute the `PromptLink: Refresh Prompts` command to manually update the prompt list.
- Automatically refresh prompts in the background based on the `promptLink.pollingInterval` setting.
- Configure server connections using `promptLink.servers` (including path, args, env).
- Default keyboard shortcut: `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Windows/Linux).
