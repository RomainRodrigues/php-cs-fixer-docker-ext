import * as vscode from 'vscode';
import { VariableResolver } from './variableResolver';
import { PathMapper } from './pathMapper';

export interface ExtensionConfig {
  // Docker settings
  container: string;
  envFile: string;
  pathMapper: PathMapper;

  // php-cs-fixer settings
  phpCsFixerPath: string;
  configFile: string;
  rules: string;

  // Fallback
  localFallback: boolean;
  localPhpCsFixerPath: string;
}

/**
 * Loads the extension configuration from VS Code settings, resolving any
 * ${workspaceFolder} variables in path-related settings.
 *
 * Returns null if no workspace is open.
 */
export function loadConfig(workspaceFolder: vscode.WorkspaceFolder): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration('phpCsFixerDocker', workspaceFolder.uri);
  const resolver = new VariableResolver(workspaceFolder.uri.fsPath);

  // 1. Load env file
  const rawEnvFile = cfg.get<string>('envFile', '${workspaceFolder}/.env');
  const envFile = resolver.resolve(rawEnvFile);
  resolver.loadEnv(envFile);

  // 2. Resolve other settings
  const rawPathMapping = cfg.get<string>('pathMapping', '${workspaceFolder}:/var/www/html');
  const pathMapper = new PathMapper(rawPathMapping, resolver);

  return {
    container: resolver.resolve(cfg.get<string>('container', '').trim()),
    envFile,
    pathMapper,
    phpCsFixerPath: resolver.resolve(cfg.get<string>('phpCsFixerPath', 'vendor/bin/php-cs-fixer')),
    configFile: resolver.resolve(cfg.get<string>('configFile', '')).trim(),
    rules: cfg.get<string>('rules', '').trim(),
    localFallback: cfg.get<boolean>('localFallback', true),
    localPhpCsFixerPath: resolver.resolve(cfg.get<string>('localPhpCsFixerPath', '')).trim(),
  };
}

/**
 * Returns the workspace folder for a given document, or undefined if none.
 */
export function getWorkspaceFolder(document: vscode.TextDocument): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.getWorkspaceFolder(document.uri);
}
