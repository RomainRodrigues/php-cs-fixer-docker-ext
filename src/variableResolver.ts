import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

/**
 * Resolves VS Code-style variables (e.g. ${workspaceFolder}) and environment
 * variables (e.g. ${env:APP_NAME}) in setting strings.
 */
export class VariableResolver {
  private variables: Record<string, string>;
  private env: Record<string, string> = {};

  constructor(workspaceFolder: string) {
    this.variables = {
      workspaceFolder: workspaceFolder,
      workspaceFolderBasename: path.basename(workspaceFolder),
    };
  }

  /**
   * Load environment variables from a .env file.
   */
  loadEnv(envFilePath: string): void {
    if (fs.existsSync(envFilePath)) {
      const parsed = dotenv.parse(fs.readFileSync(envFilePath));
      this.env = { ...this.env, ...parsed };
    }
  }

  /**
   * Replace all ${variableName} and ${env:variableName} occurrences in a string.
   * Unknown variables are left as-is.
   */
  resolve(value: string): string {
    return value.replace(/\$\{(?:env:)?(\w+)\}/g, (match, key: string) => {
      if (match.startsWith('${env:')) {
        return this.env[key] ?? process.env[key] ?? match;
      }
      return this.variables[key] ?? match;
    });
  }
}
