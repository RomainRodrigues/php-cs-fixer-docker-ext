import * as vscode from 'vscode';
import { DockerExecutor } from './dockerExecutor';

/**
 * Shows a Quick Pick with all running Docker containers.
 * On selection, saves the container name to workspace settings so the user
 * never has to manually look it up.
 */
export async function pickContainer(dockerExecutor: DockerExecutor): Promise<void> {
  const containers = await dockerExecutor.listRunningContainers();

  if (containers.length === 0) {
    vscode.window.showWarningMessage(
      'PHP CS Fixer Docker: No running Docker containers found. Make sure Docker is running.'
    );
    return;
  }

  const items: vscode.QuickPickItem[] = containers.map((c) => ({
    label: `$(container) ${c.name}`,
    description: c.image,
    detail: c.status,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: 'PHP CS Fixer Docker — Select container',
    placeHolder: 'Pick the container running PHP CS Fixer',
  });

  if (!selected) {
    return;
  }

  // Extract the container name from the label (strip the icon prefix)
  const containerName = selected.label.replace(/^\$\(container\) /, '');

  // Save to workspace settings (or global if no workspace is open)
  const target = vscode.workspace.workspaceFolders
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;

  await vscode.workspace
    .getConfiguration('phpCsFixerDocker')
    .update('container', containerName, target);

  vscode.window.showInformationMessage(
    `PHP CS Fixer Docker: Container set to "${containerName}".`
  );
}
