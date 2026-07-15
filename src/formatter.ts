import * as vscode from 'vscode';
import { DockerExecutor } from './dockerExecutor';
import { LocalExecutor } from './localExecutor';
import { loadConfig, getWorkspaceFolder } from './config';
import { detectConfigFile } from './configDetector';

/**
 * VS Code DocumentFormattingEditProvider for PHP.
 *
 * Orchestrates the formatting pipeline:
 * 1. Load config (with ${workspaceFolder} resolution)
 * 2. Detect PHP CS Fixer config file
 * 3. Format via Docker (preferred) or local fallback
 * 4. Return TextEdit to VS Code
 */
export class PhpCsFixerDockerFormatter implements vscode.DocumentFormattingEditProvider {
  constructor(
    private readonly dockerExecutor: DockerExecutor,
    private readonly localExecutor: LocalExecutor
  ) {}

  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    const workspaceFolder = getWorkspaceFolder(document);
    if (!workspaceFolder) {
      // File outside any workspace — skip silently
      return [];
    }

    const config = loadConfig(workspaceFolder);
    const workspaceRoot = workspaceFolder.uri.fsPath;
    const content = document.getText();

    // Auto-detect config file if not specified in settings
    if (!config.configFile) {
      const detected = detectConfigFile(workspaceRoot, undefined);
      if (detected) {
        config.configFile = detected;
      }
    }

    let formatted: string;

    try {
      if (config.container) {
        // === Docker mode ===
        const containerFilePath = config.pathMapper.toContainer(document.uri.fsPath);
        formatted = await this.dockerExecutor.format(
          content,
          containerFilePath,
          config,
          workspaceRoot,
          document.uri.fsPath
        );
      } else if (config.localFallback) {
        // === Local fallback ===
        formatted = await this.localExecutor.format(content, config, workspaceRoot, document.uri.fsPath);
      } else {
        vscode.window.showErrorMessage(
          'PHP CS Fixer Docker: No container configured. ' +
          'Set "phpCsFixerDocker.container" or run the "Select Docker container" command.'
        );
        return [];
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      // If Docker failed and fallback is enabled, try local
      if (config.container && config.localFallback) {
        try {
          formatted = await this.localExecutor.format(content, config, workspaceRoot, document.uri.fsPath);
          // Silent fallback — show a subtle status bar warning instead of a popup
          vscode.window.setStatusBarMessage(
            '$(warning) PHP CS Fixer: Docker unavailable, used local fallback',
            5000
          );
        } catch (fallbackErr: unknown) {
          const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          vscode.window.showErrorMessage(`PHP CS Fixer Docker: ${message}\n\nFallback also failed: ${fbMsg}`);
          return [];
        }
      } else {
        vscode.window.showErrorMessage(`PHP CS Fixer Docker: ${message}`);
        return [];
      }
    }

    // No changes — return empty array (VS Code optimisation)
    if (formatted === content) {
      return [];
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(content.length)
    );
    return [vscode.TextEdit.replace(fullRange, formatted)];
  }
}
