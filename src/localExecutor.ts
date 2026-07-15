import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionConfig } from './config';

const execFileAsync = promisify(execFile);

/**
 * Fallback executor: runs php-cs-fixer locally when no Docker container is available.
 *
 * Searches for php-cs-fixer in this order:
 * 1. The user-specified `localPhpCsFixerPath` setting
 * 2. vendor/bin/php-cs-fixer in the workspace
 * 3. php-cs-fixer in the system PATH
 */
export class LocalExecutor {
  private cachedBinPath: string | null = null;

  invalidateCache(): void {
    this.cachedBinPath = null;
  }

  async findBinary(workspaceRoot: string, config: ExtensionConfig): Promise<string> {
    if (this.cachedBinPath) {
      return this.cachedBinPath;
    }

    // 1. User-specified path
    if (config.localPhpCsFixerPath) {
      if (fs.existsSync(config.localPhpCsFixerPath)) {
        this.cachedBinPath = config.localPhpCsFixerPath;
        return this.cachedBinPath;
      }
    }

    // 2. Workspace vendor binary
    const vendorBin = path.join(workspaceRoot, 'vendor', 'bin', 'php-cs-fixer');
    if (fs.existsSync(vendorBin)) {
      this.cachedBinPath = vendorBin;
      return this.cachedBinPath;
    }

    // 3. System PATH
    try {
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      const { stdout } = await execFileAsync(whichCmd, ['php-cs-fixer']);
      const binPath = stdout.trim().split('\n')[0];
      if (binPath) {
        this.cachedBinPath = binPath;
        return this.cachedBinPath;
      }
    } catch {
      // Not in PATH
    }

    throw new Error(
      'No local php-cs-fixer found. Install it via Composer or set "phpCsFixerDocker.localPhpCsFixerPath".'
    );
  }

  /**
   * Formats PHP content using a local php-cs-fixer binary.
   */
  async format(content: string, config: ExtensionConfig, workspaceRoot: string, hostFilePath: string): Promise<string> {
    const binPath = await this.findBinary(workspaceRoot, config);

    const parsedPath = path.parse(hostFilePath);
    const tmpHostPath = path.join(parsedPath.dir, `.${parsedPath.name}.php-cs-fixer.tmp${parsedPath.ext}`);
    
    fs.writeFileSync(tmpHostPath, content);

    try {
      const args: string[] = ['fix', '--using-cache=no', '--quiet'];

      if (config.configFile) {
        args.push(`--config=${path.join(workspaceRoot, config.configFile)}`);
      } else if (config.rules) {
        args.push(`--rules=${config.rules}`);
      }

      args.push(tmpHostPath);

      return await new Promise<string>((resolve, reject) => {
        const proc = require('child_process').spawn(binPath, args, { cwd: workspaceRoot });

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

        proc.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`php-cs-fixer (local) exited with code ${code}:\n${stderr}\n${stdout}`));
            return;
          }
          const formatted = fs.readFileSync(tmpHostPath, 'utf8');
          resolve(formatted);
        });

        proc.on('error', (err: Error) => {
          reject(new Error(`Failed to run php-cs-fixer locally: ${err.message}`));
        });
      });
    } finally {
      if (fs.existsSync(tmpHostPath)) {
        fs.unlinkSync(tmpHostPath);
      }
    }
  }
}
