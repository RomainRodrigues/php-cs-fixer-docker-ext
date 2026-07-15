# PHP CS Fixer Docker

A VS Code extension to format PHP files using **PHP CS Fixer running inside your Docker containers**. It requires no absolute paths, no wrapper scripts, and allows for a single global configuration across multiple projects.

## Key Features

- **Global Configuration**: Configure once globally using `${workspaceFolder}` variables.
- **Smart Container Resolution**: Automatically finds the running container based on the Docker Compose service name using fuzzy matching.
- **Environment Variables Support**: Natively supports `.env` files for dynamic container names with a customizable `.env` path.
- **Local Fallback**: Falls back to a local `php-cs-fixer` installation if Docker is unavailable.

## Quick Start

### 1. Install the extension

Search for **PHP CS Fixer Docker** in the VS Code Extensions panel.

### 2. Configure globally

Open your global `settings.json` (`Ctrl+Shift+P` → *Open User Settings (JSON)*) and add:

```jsonc
{
  // Name of the Docker container or docker-compose service running PHP
  "phpCsFixerDocker.container": "php",

  // ${workspaceFolder} is automatically replaced with your project's root path
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/var/www/html",

  // Enable format on save for PHP files
  "editor.formatOnSave": true,
  "[php]": {
    "editor.defaultFormatter": "RomainRodrigues.php-cs-fixer-docker"
  }
}
```

### 3. Start your Docker container and format

Open a PHP file, save it, and it will be formatted automatically.

## Configuration Reference

| Setting | Default | Description |
|---|---|---|
| `phpCsFixerDocker.container` | `""` | Docker container name or docker-compose service name. Supports `${env:VAR}` variables. |
| `phpCsFixerDocker.envFile` | `"${workspaceFolder}/.env"` | Path to the `.env` file used to resolve `${env:VAR}` variables. Supports `${workspaceFolder}`. |
| `phpCsFixerDocker.pathMapping` | `"${workspaceFolder}:/var/www/html"` | `host:container` path mapping. Supports `${workspaceFolder}` and `${workspaceFolderBasename}`. |
| `phpCsFixerDocker.phpCsFixerPath` | `"vendor/bin/php-cs-fixer"` | Path to php-cs-fixer inside the container. |
| `phpCsFixerDocker.configFile` | `""` | Config filename (auto-detected if empty: `.php-cs-fixer.dist.php`, `.php-cs-fixer.php`, etc.). |
| `phpCsFixerDocker.rules` | `""` | Additional PHP CS Fixer rules JSON (used when no config file is found). Example: `{"@PSR12": true}` |
| `phpCsFixerDocker.localFallback` | `true` | Fall back to a local php-cs-fixer if Docker is unavailable. |
| `phpCsFixerDocker.localPhpCsFixerPath` | `""` | Local php-cs-fixer binary path (auto-detected if empty in workspace vendor or PATH). |

## Advanced Features

### Smart Container Resolution

You do not need to specify the exact generated name of your Docker container (e.g., `my-project-app-1`). The extension uses smart fuzzy matching. Provide the Docker Compose service name (like `php`, `app`, or `laravel.test`), and the extension will automatically find the running container that matches it. This enables you to share the exact same VS Code settings across multiple projects.

### Environment Variables (.env)

The extension natively supports `.env` files, which is extremely useful for global configuration. You can use any variable from your `.env` file in your settings using the `${env:VARIABLE_NAME}` syntax.

By default, the extension loads the `.env` file at the root of your workspace (`${workspaceFolder}/.env`). You can customize this path using the `phpCsFixerDocker.envFile` setting.

**Example with Laravel Sail:**

If your `.env` contains `APP_NAME=my-app`, Laravel Sail generates a container named `my-app-laravel.test-1`. You can configure your global settings as follows:

```jsonc
{
  "phpCsFixerDocker.container": "${env:APP_NAME}-laravel.test",
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/var/www/html"
}
```
*(If the variable is not found in the configured `.env` file, the extension falls back to your system's global environment variables.)*

## Examples

### Laravel with Docker Compose

**docker-compose.yml:**
```yaml
services:
  app:
    image: php:8.3-fpm
    container_name: laravel-app
    volumes:
      - .:/var/www/html
```

**Global settings:**
```jsonc
{
  "phpCsFixerDocker.container": "laravel-app",
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/var/www/html"
}
```

### Symfony with Docker Compose

**docker-compose.yml:**
```yaml
services:
  php:
    build: ./docker/php
    volumes:
      - .:/app
```

**Global settings:**
```jsonc
{
  "phpCsFixerDocker.container": "php",
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/app"
}
```

### Global php-cs-fixer in container

```jsonc
{
  "phpCsFixerDocker.container": "php",
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/var/www/html",
  "phpCsFixerDocker.phpCsFixerPath": "/usr/local/bin/php-cs-fixer"
}
```

### Per-project override

To use a different container path for a specific project, create a `.vscode/settings.json` file in that project:

```jsonc
// .vscode/settings.json — overrides global for this project only
{
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/srv/app"
}
```

## Commands

| Command | Description |
|---|---|
| `PHP CS Fixer Docker: Format current file` | Format the active PHP file |
| `PHP CS Fixer Docker: Select Docker container` | Pick a running container from a list and save it to settings |

## Config file auto-detection

If `phpCsFixerDocker.configFile` is empty, the extension searches for these files in your workspace root (in order):

1. `.php-cs-fixer.dist.php`
2. `.php-cs-fixer.php`
3. `.php_cs.dist`
4. `.php_cs`

## Status Bar

The extension shows its active mode in the status bar (bottom right):

- `⬡ php` — Docker mode, container name shown
- `↓ php-cs-fixer (local)` — Local fallback mode
- `⚠ PHP CS Fixer: not configured` — No container configured

Click the status bar item to open the container picker.

## Troubleshooting

- **"No running Docker container found"**: Ensure your container is running (`docker ps`). Use the **Select Container** command to pick the correct one.
- **Formatting is slow**: The first format (cold start) resolves the container ID and takes ~800ms. Subsequent saves should take ~300–500ms.
- **"php-cs-fixer returned empty output"**: Verify that `phpCsFixerDocker.phpCsFixerPath` points to a valid binary inside the container. Run `docker exec -it <container> php vendor/bin/php-cs-fixer --version` to check.
- **Config file not detected**: Set `phpCsFixerDocker.configFile` to the exact filename (e.g. `.php-cs-fixer.dist.php`).

## License

[MIT](LICENSE)