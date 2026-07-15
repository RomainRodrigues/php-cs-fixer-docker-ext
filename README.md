# PHP CS Fixer - Docker

Format PHP files using **PHP CS Fixer running inside your Docker containers** — with no absolute paths, no wrapper scripts, and no per-project configuration required.

## The problem with existing extensions

Other extensions like `yejune.docker-php-cs-fixer` require you to configure absolute host paths for every project:

```json
// ❌ Every developer must set this for every project
{
  "docker-php-cs-fixer.hostPath": "/Users/yourname/code/project",
  "docker-php-cs-fixer.dockerPath": "/var/www/html",
  "docker-php-cs-fixer.executablePath": "/Users/yourname/code/project/docker-php-cs-fixer"
}
```

This is not portable between developers and requires a manual bash script.

## Our solution

Configure **once globally** using `${workspaceFolder}` variables:

```jsonc
// ✅ Set this once in your global VS Code settings — works for ALL projects
{
  "phpCsFixerDocker.container": "php",
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/var/www/html"
}
```

That's it. Open any PHP project and format away.

---

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

---

## Configuration Reference

| Setting | Default | Description |
|---|---|---|
| `phpCsFixerDocker.container` | `""` | Docker container name or docker-compose service name |
| `phpCsFixerDocker.pathMapping` | `"${workspaceFolder}:/var/www/html"` | `host:container` path mapping. Supports `${workspaceFolder}`. |
| `phpCsFixerDocker.phpCsFixerPath` | `"vendor/bin/php-cs-fixer"` | Path to php-cs-fixer inside the container |
| `phpCsFixerDocker.configFile` | `""` | Config filename (auto-detected if empty) |
| `phpCsFixerDocker.rules` | `""` | PHP CS Fixer rules JSON (used when no config file is found) |
| `phpCsFixerDocker.localFallback` | `true` | Fall back to a local php-cs-fixer if Docker is unavailable |
| `phpCsFixerDocker.localPhpCsFixerPath` | `""` | Local php-cs-fixer binary path (auto-detected if empty) |

---

## 🧠 Smart Container Resolution

You do **not** need to type the exact generated name of your Docker container (e.g., `my-project-app-1`).

The extension uses **smart fuzzy matching**. You can simply provide the **Docker Compose service name** (like `php` or `app` or `laravel.test`), and the extension will automatically find the running container that matches it.

This allows you to share the exact same VS Code settings across multiple projects without worrying about the final container name!

---

## 🌍 Environment Variables (.env)

The extension natively supports `.env` files. This is extremely powerful for global configuration.

By default, the extension loads the `.env` file at the root of your workspace (`${workspaceFolder}/.env`). You can use any variable from this file in your settings using the `${env:VARIABLE_NAME}` syntax.

**Example with Laravel Sail:**
Your `.env` contains `APP_NAME=my-app`. Laravel Sail generates a container named `my-app-laravel.test-1`.

You can configure your global settings like this:
```jsonc
{
  "phpCsFixerDocker.container": "${env:APP_NAME}-laravel.test",
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/var/www/html"
}
```
*Note: If the variable is not found in the `.env` file, the extension will fall back to your system's global environment variables.*

---

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

### php-cs-fixer installed globally in the container

```jsonc
{
  "phpCsFixerDocker.container": "php",
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/var/www/html",
  "phpCsFixerDocker.phpCsFixerPath": "/usr/local/bin/php-cs-fixer"
}
```

### Per-project override

If one project uses a different container path, add a `.vscode/settings.json` to that project:

```jsonc
// .vscode/settings.json — overrides global for this project only
{
  "phpCsFixerDocker.pathMapping": "${workspaceFolder}:/srv/app"
}
```

---

## Commands

| Command | Description |
|---|---|
| `PHP CS Fixer Docker: Format current file` | Format the active PHP file |
| `PHP CS Fixer Docker: Select Docker container` | Pick a running container from a list and save it to settings |

---

## Config file auto-detection

If `phpCsFixerDocker.configFile` is empty, the extension searches for these files in your workspace root (in order):

1. `.php-cs-fixer.dist.php` ← most common (Symfony, Laravel)
2. `.php-cs-fixer.php`
3. `.php_cs.dist` ← older PHP CS Fixer v2 format
4. `.php_cs`

---

## Status Bar

The extension shows its active mode in the status bar (bottom right):

- `⬡ php` — Docker mode, container name shown
- `↓ php-cs-fixer (local)` — Local fallback mode
- `⚠ PHP CS Fixer: not configured` — No container configured

Click the status bar item to open the container picker.

---

## Troubleshooting

**"No running Docker container found"**
→ Make sure your container is running (`docker ps`). Use the **Select Container** command to pick the correct one.

**Formatting is slow**
→ The first format (cold start) resolves the container ID and takes ~800ms. Subsequent saves should be ~300–500ms.

**"php-cs-fixer returned empty output"**
→ Check that `phpCsFixerDocker.phpCsFixerPath` points to a valid binary inside the container.
→ Run `docker exec -it <container> php vendor/bin/php-cs-fixer --version` to verify.

**Config file not detected**
→ Set `phpCsFixerDocker.configFile` to the exact filename (e.g. `.php-cs-fixer.dist.php`).

---

## License

MIT