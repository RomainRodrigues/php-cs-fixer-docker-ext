import * as vscode from 'vscode';
import { PhpCsFixerDockerFormatter } from './formatter';
import { DockerExecutor } from './dockerExecutor';
import { LocalExecutor } from './localExecutor';
import { StatusBarManager } from './statusBar';
import { pickContainer } from './containerPicker';
import { loadConfig, getWorkspaceFolder } from './config';

export function activate(context: vscode.ExtensionContext): void {
  const dockerExecutor = new DockerExecutor();
  const localExecutor = new LocalExecutor();
  const formatter = new PhpCsFixerDockerFormatter(dockerExecutor, localExecutor);
  const statusBar = new StatusBarManager(context);

  // ── Formatter registration ─────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('php', formatter)
  );

  // ── Commands ───────────────────────────────────────────────────────────────

  // Manual format command (palette / keybinding)
  context.subscriptions.push(
    vscode.commands.registerCommand('phpCsFixerDocker.fix', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'php') {
        vscode.window.showWarningMessage('PHP CS Fixer Docker: Open a PHP file first.');
        return;
      }
      await vscode.commands.executeCommand('editor.action.formatDocument');
    })
  );

  // Container picker command
  context.subscriptions.push(
    vscode.commands.registerCommand('phpCsFixerDocker.selectContainer', async () => {
      await pickContainer(dockerExecutor);
      // Invalidate container cache so the new name is resolved on next format
      dockerExecutor.invalidateCache();
      statusBar.refreshFromConfig();
    })
  );

  // ── Config change listeners ────────────────────────────────────────────────

  // Invalidate caches when any extension setting changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('phpCsFixerDocker')) {
        dockerExecutor.invalidateCache();
        localExecutor.invalidateCache();
        statusBar.refreshFromConfig();
      }
    })
  );

  // ── Initial status bar ─────────────────────────────────────────────────────
  statusBar.refreshFromConfig();

  // Show status bar only when a PHP file is active
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'php') {
        statusBar.refreshFromConfig();
      } else {
        statusBar.hide();
      }
    })
  );
}

export function deactivate(): void {
  // Nothing to clean up — subscriptions handle disposal
}
