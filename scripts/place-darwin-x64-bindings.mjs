/**
 * Workaround for this dev machine: `node` is a universal binary, so npm and the
 * Vite/Start build can end up running as different architectures (x86_64 under
 * Rosetta, or arm64). npm only installs the native addons for the arch *it* runs
 * as, and the build then fails to find the other one. This script fetches and
 * places BOTH the darwin-x64 and darwin-arm64 variants so the build works
 * whichever way it runs.
 *
 * It is macOS-only and idempotent; on Linux/Windows/CI it no-ops.
 * Wired as `postinstall` so it survives `npm install`.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (process.platform !== 'darwin') {
  process.exit(0);
}

const root = process.cwd();
const nm = join(root, 'node_modules');

// base package (to read the version) -> the darwin bindings to ensure
const targets = [
  { base: 'rolldown', bindings: ['@rolldown/binding-darwin-x64', '@rolldown/binding-darwin-arm64'] },
  { base: 'lightningcss', bindings: ['lightningcss-darwin-x64', 'lightningcss-darwin-arm64'] },
  { base: '@tailwindcss/oxide', bindings: ['@tailwindcss/oxide-darwin-x64', '@tailwindcss/oxide-darwin-arm64'] },
];

function versionOf(pkg) {
  try {
    return JSON.parse(readFileSync(join(nm, pkg, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
}

for (const { base, bindings } of targets) for (const x64 of bindings) {
  const dest = join(nm, x64);
  const version = versionOf(base);
  if (!version) continue; // base not installed → nothing to do
  if (existsSync(dest)) continue; // already placed

  try {
    const tarball = execSync(`npm view ${x64}@${version} dist.tarball`, {
      encoding: 'utf8',
    }).trim();
    if (!tarball) continue;
    const work = join(tmpdir(), `x64bind-${x64.replace(/[/@]/g, '_')}`);
    rmSync(work, { recursive: true, force: true });
    mkdirSync(work, { recursive: true });
    execSync(`curl -sL "${tarball}" -o b.tgz && tar -xzf b.tgz`, { cwd: work });
    mkdirSync(dest, { recursive: true });
    execSync(`cp -R "${join(work, 'package')}/." "${dest}/"`);
    rmSync(work, { recursive: true, force: true });
    console.log(`[place-darwin-x64] placed ${x64}@${version}`);
  } catch (err) {
    console.warn(`[place-darwin-x64] could not place ${x64}: ${err.message}`);
  }
}
