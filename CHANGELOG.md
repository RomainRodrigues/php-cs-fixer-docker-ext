# Changelog

All notable changes to PHP CS Fixer - Docker will be documented in this file.

## [0.1.0] - 2026-07-15

### Added
- Initial release
- Format PHP files using PHP CS Fixer running inside Docker containers
- `${workspaceFolder}` variable support in all path settings — configure once globally
- Auto-detection of PHP CS Fixer config files (`.php-cs-fixer.dist.php`, `.php-cs-fixer.php`, `.php_cs.dist`, `.php_cs`)
- Local php-cs-fixer fallback when Docker container is unavailable
- Quick Pick command to select a running Docker container
- Status bar indicator showing active mode (Docker / local / unconfigured)
- Cache for container ID resolution (performance)
- Docker Compose v1 and v2 compatible
