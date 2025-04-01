import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Prompt, PromptResponse, PromptRequest, PromptQuickPickItem, TargetOption, MCPServerConfig, TransportOptions, } from './types';

const mcpClients: Map<string, Client> = new Map();
let activationError = false;
let pollingInterval: NodeJS.Timeout | undefined;

async function executeCommand(command: string, ...args: unknown[]): Promise<void> {
    try {
        await vscode.commands.executeCommand(command, ...args);
    } catch (error) {
        console.error(`Error executing command '${command}':`, error);
        throw error;
    }
}

function getMCPServerConfigs(): MCPServerConfig[] {
    const config = vscode.workspace.getConfiguration('promptLink');
    const serverConfigs = config.get<MCPServerConfig[]>('servers');

    if (!serverConfigs?.length) {
        vscode.window.showWarningMessage('No MCP servers configured. Please configure `promptLink.servers` in your settings.');
        return [];
    }

    // Validate and deduplicate configs
    const names = new Set<string>();
    return serverConfigs.filter(server => {
        if (!server.name || !server.command) {
            console.warn(`Invalid server config: ${JSON.stringify(server)}. Missing 'name' or 'command'.`);
            vscode.window.showWarningMessage('Invalid MCP server configuration detected. Missing required fields.');
            return false;
        }
        if (names.has(server.name)) {
            console.warn(`Duplicate server name: ${server.name}`);
            vscode.window.showWarningMessage(`Duplicate MCP server name "${server.name}" detected.`);
            return false;
        }
        names.add(server.name);
        return true;
    });
}

async function createMCPClient(serverConfig: MCPServerConfig): Promise<Client> {
    const client = new Client(
        {
            name: `prompt-link-client-${serverConfig.name}`,
            version: "1.0.0"
        },
        { capabilities: { prompts: {} } }
    );

    const transportOptions: TransportOptions = {
        command: serverConfig.command,
        args: serverConfig.args || [],
        ...(serverConfig.env && { 
            env: Object.fromEntries(
                Object.entries({ ...process.env, ...serverConfig.env })
                    .filter((entry): entry is [string, string] => 
                        typeof entry[1] === 'string'
                    )
            )
        })
    };

    const transport = new StdioClientTransport(transportOptions);

    try {
        await client.connect(transport);
        return client;
    } catch (error) {
        throw new Error(`Failed to connect to server "${serverConfig.name}": ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function handlePromptArguments(prompt: Prompt): Promise<Record<string, string>> {
    const params: Record<string, string> = {};
    const args = prompt.arguments || [];

    for (const arg of args) {
        const isRequired = arg.required === true;
        const value = await vscode.window.showInputBox({
            prompt: `Provide a value for ${arg.name}${arg.description ? ` (${arg.description})` : ''} (${isRequired ? 'Required' : 'Optional'})`,
            placeHolder: arg.description || arg.name,
            ignoreFocusOut: true,
            validateInput: isRequired ? (text => !text ? 'This field is required' : null) : undefined
        });

        if (value === undefined) {
            throw new Error(`Cancelled: ${isRequired ? 'Required' : 'Optional'} argument ${arg.name} was not provided`);
        }

        if (value) {
            params[arg.name] = value;
        }
    }

    return params;
}

async function getTargetOptions(): Promise<TargetOption[]> {
    const options: TargetOption[] = [];
    const availableCommands = await vscode.commands.getCommands();

    if (availableCommands.includes('roo-cline.SidebarProvider.focus')) {
        options.push({
            label: "Send to RooCode",
            description: "Copy prompt and open RooCode",
            action: async (content: string) => {
                await vscode.env.clipboard.writeText(content);
                await executeCommand('roo-cline.SidebarProvider.focus');
                vscode.window.showInformationMessage('Copied prompt to clipboard. Please paste into RooCode.');
            }
        });
    }

    if (availableCommands.includes('aichat.newfollowupaction')) {
        options.push({
            label: "Send to Cursor",
            description: "Copy prompt and open Cursor",
            action: async (content: string) => {
                await vscode.env.clipboard.writeText(content);
                await executeCommand('aichat.newfollowupaction');
                vscode.window.showInformationMessage('Copied prompt to clipboard. Please paste into Cursor.');
            }
        });
    }

    if (availableCommands.includes('workbench.action.chat.openEditSession')) {
        options.push({
            label: "Send to GitHub Copilot",
            description: "Copy prompt and open Copilot Chat",
            action: async (content: string) => {
                await vscode.env.clipboard.writeText(content);
                await executeCommand('workbench.action.chat.openEditSession');
                vscode.window.showInformationMessage('Copied prompt to clipboard. Please paste into GitHub Copilot Chat.');
            }
        });
    }


    options.push({
        label: "Copy to Clipboard",
        description: "Copy for manual pasting",
        action: async (content: string) => {
            await vscode.env.clipboard.writeText(content);
            vscode.window.showInformationMessage('Copied prompt to clipboard');
        }
    });

    return options;
}

// Error Handlers
function handlePromptError(error: unknown, promptName?: string, serverName?: string): void {
    const context = [serverName, promptName].filter(Boolean).join(' - ');
    const prefix = context ? `[${context}] ` : '';

    if (error instanceof Error) {
        if (error.message.includes('invalid_type')) {
            const [, expectedType, receivedType] = error.message.match(/Expected ([^,]+), received ([^"]+)/) || [];
            const [, paramPath] = error.message.match(/"path":\s*\[\s*"([^"]+)"/) || [];
            vscode.window.showErrorMessage(`${prefix}Invalid argument type: Expected ${expectedType || 'unknown'} for "${paramPath || 'unknown'}", received ${receivedType || 'unknown'}`);
        } else if (error.message.includes('required')) {
            const [, paramPath] = error.message.match(/"path":\s*\[\s*"([^"]+)"/) || [];
            vscode.window.showErrorMessage(`${prefix}Required parameter "${paramPath || 'unknown'}" is missing`);
        } else {
            vscode.window.showErrorMessage(`${prefix}${error.message}`);
        }
    } else {
        vscode.window.showErrorMessage(`${prefix}${String(error)}`);
    }
}

function handleMCPError(error: unknown, serverName?: string): void {
    const prefix = serverName ? `[${serverName}] ` : '';

    if (error instanceof Error) {
        if (error.message.includes('ENOENT') || error.message.includes('Command not found')) {
            vscode.window.showErrorMessage(`${prefix}Failed to start MCP server: Command/path not found`);
        } else if (error.message.includes('Connection closed')) {
            vscode.window.showErrorMessage(`${prefix}MCP server process closed unexpectedly`);
        } else {
            vscode.window.showErrorMessage(`${prefix}${error.message}`);
        }
    } else {
        vscode.window.showErrorMessage(`${prefix}${String(error)}`);
    }
}

function getPollingInterval(): number {
    const config = vscode.workspace.getConfiguration('promptLink');
    const interval = config.get<number>('pollingInterval');
    // Default to 5 minutes if not set or invalid
    return interval && interval > 0 ? interval * 1000 : 5 * 60 * 1000;
}

function startPolling(): void {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    const interval = getPollingInterval();
    pollingInterval = setInterval(async () => { // Make async
        try {
            // Call internal refresh silently, we don't need to show a toast every time it automatically refreshes
            const { errorOccurred } = await _refreshPromptsInternal();
            if (errorOccurred) {
                console.warn('Error during silent background prompt refresh. Check logs for details.');
            }
        } catch (error) {
            console.error('Unexpected error during polling refresh:', error);
        }
    }, interval);
}

function stopPolling(): void {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = undefined;
    }
}

// Command Handlers
async function handleInsertPrompt(): Promise<void> {
    if (mcpClients.size === 0) {
        vscode.window.showInformationMessage('No MCP servers connected. Please check your configuration or server status.');
        return;
    }

    const allPrompts: PromptQuickPickItem[] = [];
    let listErrorOccurred = false;

    try {
        const promptPromises = Array.from(mcpClients.entries()).map(async ([serverName, client]) => {
            try {
                const result = await client.listPrompts();
                const prompts = (result.prompts || []) as Prompt[];
                return prompts.map(prompt => ({
                    label: `$(server) ${serverName}: ${prompt.name}`,
                    description: prompt.description || '',
                    prompt,
                    serverName
                }));
            } catch (error) {
                listErrorOccurred = true;
                console.error(`Failed to list prompts from server "${serverName}":`, error);
                vscode.window.showErrorMessage(`Failed to list prompts from server "${serverName}": ${error instanceof Error ? error.message : String(error)}`);
                return [];
            }
        });

        const results = await Promise.all(promptPromises);
        allPrompts.push(...results.flat());
    } catch (error) {
        listErrorOccurred = true;
        console.error("Unexpected error aggregating prompts:", error);
        vscode.window.showErrorMessage('An unexpected error occurred while fetching prompts.');
    }

    if (allPrompts.length === 0) {
        if (!listErrorOccurred) {
            vscode.window.showInformationMessage('No prompts available from any connected server.');
        }
        return;
    }

    allPrompts.sort((a, b) => a.label.localeCompare(b.label));

    const promptPicker = vscode.window.createQuickPick<PromptQuickPickItem>();
    promptPicker.title = 'Select Prompt';
    promptPicker.placeholder = 'Choose a prompt to insert...';
    promptPicker.items = allPrompts;
    promptPicker.matchOnDescription = true;

    promptPicker.onDidAccept(async () => {
        const selectedItem = promptPicker.selectedItems[0];
        if (!selectedItem) {return;}

        promptPicker.hide();
        const { prompt, serverName } = selectedItem;
        const client = mcpClients.get(serverName);

        if (!client) {
            vscode.window.showErrorMessage(`Error: Could not find the client for server "${serverName}".`);
            return;
        }

        try {
            const hasArguments = prompt.arguments?.some(arg => arg.name?.trim());
            const promptRequest: PromptRequest = {
                name: prompt.name,
                arguments: hasArguments ? await handlePromptArguments(prompt) : {}
            };

            const response = await client.getPrompt(promptRequest) as PromptResponse;
            // Join all message texts, separated by double newlines
            const messages = response.messages || [];
            const promptContent = messages
                .map(msg => msg?.content?.text)
                .filter(text => text !== undefined && text !== null)
                .join('\n\n');

            if (!promptContent) {
                throw new Error('Failed to get prompt content (empty or missing)');
            }

            const targetOptions = await getTargetOptions();
            const targetPicker = vscode.window.createQuickPick<TargetOption>();
            targetPicker.title = 'Select Target';
            targetPicker.placeholder = 'Where should the prompt be sent?';
            targetPicker.items = targetOptions;

            targetPicker.onDidAccept(async () => {
                const selectedTarget = targetPicker.selectedItems[0];
                if (selectedTarget) {
                    targetPicker.hide();
                    await selectedTarget.action(promptContent);
                }
            });

            targetPicker.show();
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Cancelled:')) {
                vscode.window.showInformationMessage(error.message);
            } else {
                handlePromptError(error, prompt.name, serverName);
            }
        }
    });

    promptPicker.show();
}

// Internal function to refresh prompts without showing notifications
async function _refreshPromptsInternal(): Promise<{ totalPrompts: number; errorOccurred: boolean }> {
    if (mcpClients.size === 0) {
        console.log('No PromptLink servers connected. Cannot refresh prompts internally.');
        return { totalPrompts: 0, errorOccurred: false }; // No servers isn't an error in this context
    }

    let totalPrompts = 0;
    let refreshErrorOccurred = false;

    try {
        const refreshPromises = Array.from(mcpClients.entries()).map(async ([serverName, client]) => {
            try {
                const result = await client.listPrompts();
                const count = result.prompts?.length || 0;
                return count;
            } catch (error) {
                refreshErrorOccurred = true;
                // Log error instead of showing message
                console.error(`Failed to refresh prompts from server "${serverName}" during internal check:`, error);
                // Optionally show error only if manually triggered? For now, just log.
                // vscode.window.showErrorMessage(`Failed to refresh prompts from server "${serverName}": ${error instanceof Error ? error.message : String(error)}`);
                return 0;
            }
        });

        const counts = await Promise.all(refreshPromises);
        totalPrompts = counts.reduce((sum, count) => sum + count, 0);

    } catch (error) {
        refreshErrorOccurred = true; // Indicate error on aggregation failure
        console.error("Unexpected error aggregating internal refresh counts:", error);
        // Optionally show error only if manually triggered? For now, just log.
        // vscode.window.showErrorMessage('An unexpected error occurred while refreshing prompts internally.');
    }

    return { totalPrompts, errorOccurred: refreshErrorOccurred };
}

// Command handler: Refreshes prompts and shows notification
async function handleRefreshPrompts(): Promise<void> {
    if (mcpClients.size === 0) {
        vscode.window.showInformationMessage('No PromptLink servers connected. Cannot refresh prompts.');
        return;
    }

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Refreshing MCP Prompts...",
        cancellable: false
    }, async (progress) => {
        try {
            const { totalPrompts, errorOccurred } = await _refreshPromptsInternal();

            if (!errorOccurred) {
                vscode.window.showInformationMessage(`MCP Prompts refreshed - ${totalPrompts} prompts available across ${mcpClients.size} server(s).`);
            } else {
                vscode.window.showWarningMessage(`MCP Prompts refreshed with errors. ${totalPrompts} prompts available across ${mcpClients.size} server(s). Check logs for details.`);
            }
        } catch (error) {
            // Catch errors from _refreshPromptsInternal if any slip through (shouldn't happen often with current logic)
            console.error("Unexpected error during manual refresh:", error);
            vscode.window.showErrorMessage('An unexpected error occurred while refreshing prompts.');
        }
    });
}

// Extension Activation
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('PromptLink extension activating...');
    activationError = false;
    mcpClients.clear();

    const serverConfigs = getMCPServerConfigs();

    if (serverConfigs.length > 0) {
        const connectionPromises = serverConfigs.map(async (config) => {
            try {
                const client = await createMCPClient(config);
                mcpClients.set(config.name, client);
            } catch (error) {
                activationError = true;
                handleMCPError(error, config.name);
            }
        });
        await Promise.all(connectionPromises);
    }

    let initialPromptCount = 0;
    let initialRefreshError = false;
    if (mcpClients.size > 0 && !activationError) {
        // Perform initial silent refresh to get count for startup message
        try {
            const { totalPrompts, errorOccurred } = await _refreshPromptsInternal();
            initialPromptCount = totalPrompts;
            initialRefreshError = errorOccurred;
            if (initialRefreshError) {
                 console.warn('Error during initial prompt fetch on activation. Check logs.');
            }
        } catch (error) {
            console.error("Unexpected error during initial prompt fetch:", error);
            initialRefreshError = true; // Mark error if the fetch itself fails
        }
    }

    const keybindingText = await getKeybindingText();
    let status = '';
    if (mcpClients.size > 0) {
        status = `PromptLink: ${mcpClients.size} MCP server(s) connected, ${initialPromptCount} prompts available. Use ${keybindingText} to insert prompts.`;
        if (initialRefreshError) {
            status += ' (Initial prompt fetch had errors)';
        }
    } else if (activationError) {
        status = 'PromptLink: Failed to connect to some/all MCP servers. Check configuration and server status.';
    }
    // If no servers configured and no errors, status remains empty (no message needed)


    if (status) {
        // Use showWarningMessage if there were activation or initial refresh errors
        if (activationError || initialRefreshError) {
            vscode.window.showWarningMessage(status);
        } else {
            vscode.window.showInformationMessage(status);
        }
    }

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('prompt-link.insertPrompt', handleInsertPrompt),
        vscode.commands.registerCommand('prompt-link.refreshPrompts', handleRefreshPrompts)
    );

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('promptLink.servers')) {
                vscode.window.showInformationMessage('PromptLink server configuration changed. Reloading MCP server connections...');
                mcpClients.clear();
                await activate(context);
                vscode.window.showInformationMessage('MCP server connections reloaded.');
            } else if (e.affectsConfiguration('promptLink.pollingInterval')) {
                startPolling();
            }
        })
    );

    // Start polling
    startPolling();
}

async function getKeybindingText(): Promise<string> {
    const keybindings = await vscode.commands.getCommands();
    if (keybindings.includes('prompt-link.insertPrompt')) {
        // Use the default keybinding if no custom one is set
        return 'Cmd+Shift+A (Mac) / Ctrl+Shift+A (Windows/Linux)';
    }
    return 'Cmd+Shift+A (Mac) / Ctrl+Shift+A (Windows/Linux)';
}

// Extension Deactivation
export function deactivate(): Thenable<void> | undefined {
    console.log('PromptLink extension deactivating...');
    stopPolling();
    mcpClients.clear();
    return Promise.resolve();
}
