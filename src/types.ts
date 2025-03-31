import * as vscode from 'vscode';

export interface Prompt {
    name: string;
    description?: string;
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}

export interface PromptResponse {
    messages: Array<{
        role: string;
        content: {
            type: string;
            text: string;
        };
    }>;
}

export interface PromptRequest {
    [key: string]: unknown;
    name: string;
    arguments?: Record<string, string>;
}

export interface PromptQuickPickItem extends vscode.QuickPickItem {
    prompt: Prompt;
    serverName: string; // Added to identify the source server
}

export interface TargetOption extends vscode.QuickPickItem {
    action: (content: string) => Promise<void>;
}


export interface MCPServerConfig {
    name: string;
    path: string;
    args?: string[];
    env?: Record<string, string>;
}

export interface TransportOptions {
    command: string;
    args: string[];
    env?: Record<string, string>;
}
