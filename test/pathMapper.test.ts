import * as assert from 'assert';
import { PathMapper } from '../src/pathMapper';
import { VariableResolver } from '../src/variableResolver';

suite('PathMapper', () => {
  const WORKSPACE = '/home/romain/projects/my-app';
  let resolver: VariableResolver;

  setup(() => {
    resolver = new VariableResolver(WORKSPACE);
  });

  test('converts host path to container path', () => {
    const mapper = new PathMapper('${workspaceFolder}:/var/www/html', resolver);
    assert.strictEqual(
      mapper.toContainer(`${WORKSPACE}/src/Controller/Foo.php`),
      '/var/www/html/src/Controller/Foo.php'
    );
  });

  test('converts workspace root itself', () => {
    const mapper = new PathMapper('${workspaceFolder}:/var/www/html', resolver);
    assert.strictEqual(mapper.toContainer(WORKSPACE), '/var/www/html');
  });

  test('converts container path back to host path', () => {
    const mapper = new PathMapper('${workspaceFolder}:/var/www/html', resolver);
    assert.strictEqual(
      mapper.toHost('/var/www/html/src/Controller/Foo.php'),
      `${WORKSPACE}/src/Controller/Foo.php`
    );
  });

  test('works with /app container path', () => {
    const mapper = new PathMapper('${workspaceFolder}:/app', resolver);
    assert.strictEqual(
      mapper.toContainer(`${WORKSPACE}/index.php`),
      '/app/index.php'
    );
  });

  test('exposes resolved hostPath and containerPath', () => {
    const mapper = new PathMapper('${workspaceFolder}:/var/www/html', resolver);
    assert.strictEqual(mapper.hostPath, WORKSPACE);
    assert.strictEqual(mapper.containerPath, '/var/www/html');
  });

  test('throws on invalid format', () => {
    assert.throws(() => {
      new PathMapper('invalid-no-colon', resolver);
    });
  });
});
