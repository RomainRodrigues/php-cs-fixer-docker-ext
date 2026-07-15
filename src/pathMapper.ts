import * as path from 'path';
import { VariableResolver } from './variableResolver';

/**
 * Parses a "host:container" path mapping setting and provides host↔container
 * path conversion. The host side supports ${workspaceFolder} variables.
 *
 * Example mapping string: "${workspaceFolder}:/var/www/html"
 */
export class PathMapper {
  public readonly hostPath: string;
  public readonly containerPath: string;

  constructor(pathMapping: string, resolver: VariableResolver) {
    const resolved = resolver.resolve(pathMapping);
    const [host, container] = PathMapper.parseParts(resolved);
    this.hostPath = host;
    this.containerPath = container;
  }

  /**
   * Convert an absolute host file path to its equivalent container path.
   *
   * Example:
   *   host:      /home/user/project/src/Controller/Foo.php
   *   container: /var/www/html/src/Controller/Foo.php
   */
  toContainer(hostFilePath: string): string {
    const relative = path.relative(this.hostPath, hostFilePath);
    // Always use POSIX separators inside the container (Linux)
    // When relative is empty (workspace root itself), avoid a trailing slash
    if (!relative) {
      return this.containerPath;
    }
    return [this.containerPath, ...relative.split(path.sep)].join('/');
  }

  /**
   * Convert a container path back to an absolute host path.
   */
  toHost(containerFilePath: string): string {
    const relative = containerFilePath.startsWith(this.containerPath)
      ? containerFilePath.slice(this.containerPath.length).replace(/^\//, '')
      : containerFilePath;
    return path.join(this.hostPath, relative);
  }

  /**
   * Split "host:container" into its two parts.
   * Handles Windows paths like "C:/foo" by checking if the first segment
   * looks like a drive letter, and if so, joining it back.
   */
  private static parseParts(mapping: string): [string, string] {
    const parts = mapping.split(':');

    // Standard case: "/host/path:/container/path" → 2 parts
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }

    // Windows case: "C:/host/path:/container/path" → 3 parts (drive + rest + container)
    if (parts.length === 3 && parts[0].length === 1) {
      return [`${parts[0]}:${parts[1]}`, parts[2]];
    }

    throw new Error(
      `Invalid pathMapping format: "${mapping}". Expected "host:container" (e.g. "\${workspaceFolder}:/var/www/html").`
    );
  }
}
