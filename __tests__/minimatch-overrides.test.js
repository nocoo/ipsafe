describe('minimatch security overrides', () => {
  it('supports brace expansion via CommonJS Minimatch', () => {
    const { Minimatch } = require('minimatch');
    const matcher = new Minimatch('**/*.{js,cjs}');
    expect(matcher.match('lib/ipsafe.js')).toBe(true);
    expect(matcher.match('lib/ipsafe.ts')).toBe(false);
  });

  it('loads ESLint minimatch consumers (ESM entry points)', async () => {
    await expect(import('@eslint/config-array')).resolves.toBeDefined();
  });
});
