import * as fs from 'fs';
import * as path from 'path';

/**
 * Known PHP CS Fixer config filenames, in order of priority.
 */
const CONFIG_FILENAMES = [
  '.php-cs-fixer.dist.php',
  '.php-cs-fixer.php',
  '.php_cs.dist',
  '.php_cs',
];

/**
 * Detects a PHP CS Fixer config file in the given workspace directory.
 *
 * Priority:
 * 1. A custom filename specified by the user in settings (just the filename,
 *    not a full path — resolved relative to workspaceRoot).
 * 2. Auto-detection from the well-known filenames list above.
 *
 * Returns the filename (not full path) to pass to php-cs-fixer via --config,
 * or null if none found. The caller is responsible for prepending the
 * container path.
 */
export function detectConfigFile(workspaceRoot: string, customName?: string): string | null {
  const candidates = customName ? [customName, ...CONFIG_FILENAMES] : CONFIG_FILENAMES;

  for (const name of candidates) {
    if (fs.existsSync(path.join(workspaceRoot, name))) {
      return name;
    }
  }

  return null;
}
