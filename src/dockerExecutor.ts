import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionConfig } from './config';

const execFileAsync = promisify(execFile);

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
}

/**
 * Handles all interaction with the Docker CLI:
 * - Detecting the available docker/docker-compose command
 * - Resolving container names to running container IDs
 * - Formatting PHP content via docker exec + php-cs-fixer
 *
 * Container IDs are cached to avoid repeated `docker ps` calls on every save.
 */
export class DockerExecutor {
  private cachedContainerId: string | null = null;
  private cachedContainerName: string | null = null;

  invalidateCache(): void {
    this.cachedContainerId = null;
    this.cachedContainerName = null;
  }

  /**
   * Lists all currently running containers (for the Quick Pick command).
   */
  async listRunningContainers(): Promise<DockerContainer[]> {
    try {
      const { stdout } = await execFileAsync('docker', [
        'ps',
        '--format',
        '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}',
      ]);

      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, name, image, ...statusParts] = line.split('\t');
          return { id, name, image, status: statusParts.join(' ') };
        });
    } catch {
      return [];
    }
  }

  /**
   * Resolves a container name (or service name) to a running container ID.
   * Uses cache to avoid repeated docker ps calls.
   *
   * Matches against:
   * - Exact container name
   * - Container name containing the given string (for docker-compose service names)
   */
  async resolveContainerId(containerName: string): Promise<string> {
    // Return cached value if container name hasn't changed
    if (this.cachedContainerId && this.cachedContainerName === containerName) {
      return this.cachedContainerId;
    }

    const containers = await this.listRunningContainers();

    // Try exact match first
    let match = containers.find((c) => c.name === containerName);

    // Then try contains match (for docker-compose service names like "php" matching "project-php-1")
    if (!match) {
      match = containers.find(
        (c) => c.name.includes(containerName) || c.name.includes(`-${containerName}-`) ||
               c.name.startsWith(`${containerName}-`) || c.name.endsWith(`-${containerName}`)
      );
    }

    if (!match) {
      throw new Error(
        `No running Docker container found matching "${containerName}". ` +
        `Make sure your container is running and the "phpCsFixerDocker.container" setting is correct.\n\n` +
        `Running containers:\n${containers.map((c) => `  - ${c.name}`).join('\n') || '  (none)'}`
      );
    }

    this.cachedContainerId = match.id;
    this.cachedContainerName = containerName;
    return match.id;
  }

  /**
   * Formats PHP content by piping it to php-cs-fixer running inside a container.
   *
   * Uses stdin/stdout so no temp files are needed and no disk I/O occurs
   * on either the host or the container side.
   *
   * Command:
   *   echo "<content>" | docker exec -i <container> php <fixer> fix \
   *     --using-cache=no [--config=<file>] [--rules=<json>] -
   */
  async format(
    content: string,
    containerFilePath: string,
    config: ExtensionConfig,
    workspaceRoot: string,
    hostFilePath: string
  ): Promise<string> {
    const containerId = await this.resolveContainerId(config.container);

    const parsedPath = path.parse(hostFilePath);
    const tmpHostPath = path.join(parsedPath.dir, `.${parsedPath.name}.php-cs-fixer.tmp${parsedPath.ext}`);
    const tmpContainerPath = config.pathMapper.toContainer(tmpHostPath);

    fs.writeFileSync(tmpHostPath, content);

    try {
      const args = this.buildFixerArgs(config, tmpContainerPath, workspaceRoot);

      return await new Promise<string>((resolve, reject) => {
        const proc = require('child_process').spawn('docker', ['exec', containerId, ...args]);

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

        proc.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`php-cs-fixer exited with code ${code}:\n${stderr}\n${stdout}`));
            return;
          }
          const formatted = fs.readFileSync(tmpHostPath, 'utf8');
          resolve(formatted);
        });

        proc.on('error', (err: Error) => {
          reject(new Error(`Failed to run docker: ${err.message}`));
        });
      });
    } finally {
      if (fs.existsSync(tmpHostPath)) {
        fs.unlinkSync(tmpHostPath);
      }
    }
  }

  /**
   * Builds the php-cs-fixer argument list (everything after `docker exec -i <id>`).
   */
  private buildFixerArgs(
    config: ExtensionConfig,
    containerFilePath: string,
    workspaceRoot: string
  ): string[] {
    const fixerPath = config.phpCsFixerPath;

    // Determine config file path inside the container
    let configArg: string | null = null;
    if (config.configFile) {
      // User specified a config file — translate to container path
      configArg = config.pathMapper.toContainer(
        require('path').join(workspaceRoot, config.configFile)
      );
    }

    const args: string[] = ['php', fixerPath, 'fix', '--using-cache=no', '--quiet'];

    if (configArg) {
      args.push(`--config=${configArg}`);
    } else if (config.rules) {
      args.push(`--rules=${config.rules}`);
    }

    args.push(containerFilePath);

    return args;
  }
}
