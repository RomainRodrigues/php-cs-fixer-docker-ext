import * as assert from 'assert';
import { VariableResolver } from '../src/variableResolver';

suite('VariableResolver', () => {
  const WORKSPACE = '/home/romain/projects/my-app';
  let resolver: VariableResolver;

  setup(() => {
    resolver = new VariableResolver(WORKSPACE);
  });

  test('replaces ${workspaceFolder}', () => {
    assert.strictEqual(
      resolver.resolve('${workspaceFolder}:/var/www/html'),
      `${WORKSPACE}:/var/www/html`
    );
  });

  test('replaces ${workspaceFolderBasename}', () => {
    assert.strictEqual(
      resolver.resolve('${workspaceFolderBasename}'),
      'my-app'
    );
  });

  test('replaces multiple occurrences', () => {
    assert.strictEqual(
      resolver.resolve('${workspaceFolder} and ${workspaceFolder}'),
      `${WORKSPACE} and ${WORKSPACE}`
    );
  });

  test('leaves unknown variables unchanged', () => {
    assert.strictEqual(
      resolver.resolve('${unknownVar}'),
      '${unknownVar}'
    );
  });

  test('handles string with no variables', () => {
    assert.strictEqual(resolver.resolve('/var/www/html'), '/var/www/html');
  });

  test('handles empty string', () => {
    assert.strictEqual(resolver.resolve(''), '');
  });
});
