/**
 * Workaround for this dev machine: `node` is a universal binary and Vite/Start
 * builds run under Rosetta (x86_64), so native addons resolve their darwin-x64
 * variants at build time. But `npm install` (seeing arm64 hardware) installs
 * only the darwin-arm64 variants. This script fetches + places the matching
 * darwin-x64 binaries alongside the arm64 ones so the build works either way.
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

// base package (to read the version) -> the darwin-x64 sibling to ensure
const targets = [
  { base: 'rolldown', x64: '@rolldown/binding-darwin-x64' },
  { base: 'lightningcss', x64: 'lightningcss-darwin-x64' },
  { base: '@tailwindcss/oxide', x64: '@tailwindcss/oxide-darwin-x64' },
];

function versionOf(pkg) {
  try {
    return JSON.parse(readFileSync(join(nm, pkg, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
}

for (const { base, x64 } of targets) {
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
