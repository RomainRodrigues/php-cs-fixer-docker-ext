import * as vscode from 'vscode';

type StatusMode = 'container' | 'local' | 'unconfigured';

/**
 * Manages the status bar item that shows the active PHP CS Fixer mode.
 *
 * Shows:
 *   🐳 <container-name>   — Docker mode
 *   💻 local             — Local fallback mode
 *   ⚠️ Not configured    — No container set
 *
 * Clicking the item opens the Select Container quick pick.
 */
export class StatusBarManager {
  private readonly item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'phpCsFixerDocker.selectContainer';
    this.item.tooltip = 'PHP CS Fixer Docker — click to select container';
    context.subscriptions.push(this.item);
  }

  update(mode: StatusMode, label?: string): void {
    switch (mode) {
      case 'container':
        this.item.text = `$(container) ${label ?? ''}`;
        this.item.backgroundColor = undefined;
        break;
      case 'local':
        this.item.text = `$(desktop-download) php-cs-fixer (local)`;
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      case 'unconfigured':
        this.item.text = `$(warning) PHP CS Fixer: not configured`;
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
    }
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  /**
   * Refresh the status bar based on current workspace settings.
   */
  refreshFromConfig(): void {
    const cfg = vscode.workspace.getConfiguration('phpCsFixerDocker');
    const container = cfg.get<string>('container', '').trim();
    const localFallback = cfg.get<boolean>('localFallback', true);

    if (container) {
      this.update('container', container);
    } else if (localFallback) {
      this.update('local');
    } else {
      this.update('unconfigured');
    }
  }
}
