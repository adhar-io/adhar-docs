import { useEffect, useState } from "react";

/**
 * Real release data for the docs version selector.
 *
 * The site documents the LATEST release. Earlier releases are not rebuilt
 * here; each one links to that tag's docs and release notes on GitHub, so a
 * reader on an older platform can read what applies to them.
 *
 * Releases are fetched live from the GitHub Releases API (published releases
 * only — a bare git tag with no release is skipped, which is what we want) and
 * cached per tab for an hour. Server render and the first client render use
 * the static `fallback`, so hydration matches and the selector still works
 * offline or when the API rate-limits.
 */

export interface Release {
  tag: string;
  /** ISO date, YYYY-MM-DD */
  date?: string;
  prerelease?: boolean;
}

export interface VersionSource {
  /** GitHub "owner/name" */
  repo: string;
  /** Path to the docs inside the repo at a tag, e.g. "docs"; "" = repo root */
  docsPath: string;
  /** Used for server render, first paint, offline and API failure */
  fallback: Release[];
}

const TTL_MS = 60 * 60 * 1000;

export const githubUrls = (src: VersionSource) => ({
  releases: `https://github.com/${src.repo}/releases`,
  release: (tag: string) => `https://github.com/${src.repo}/releases/tag/${encodeURIComponent(tag)}`,
  docsAt: (tag: string) =>
    `https://github.com/${src.repo}/tree/${encodeURIComponent(tag)}${src.docsPath ? `/${src.docsPath}` : ""}`,
  repo: `https://github.com/${src.repo}`,
});

function readCache(key: string): Release[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { at, releases } = JSON.parse(raw) as { at: number; releases: Release[] };
    return Date.now() - at < TTL_MS ? releases : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, releases: Release[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), releases }));
  } catch {
    /* storage unavailable (private mode, quota) — the fetch still worked */
  }
}

export function useReleases(src: VersionSource): { releases: Release[]; live: boolean } {
  const repo = src.repo;
  const key = `adhar-docs:releases:${repo}`;
  // Start from this session's cache when there is one; otherwise the static fallback.
  const [state, setState] = useState(() => {
    const cached = typeof window === "undefined" ? null : readCache(key);
    return cached?.length ? { releases: cached, live: true } : { releases: src.fallback, live: false };
  });

  useEffect(() => {
    if (state.live) return;
    const ctrl = new AbortController();
    fetch(`https://api.github.com/repos/${repo}/releases?per_page=15`, {
      signal: ctrl.signal,
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Array<{ tag_name: string; published_at?: string; prerelease?: boolean; draft?: boolean }>) => {
        const list = data
          .filter((r) => !r.draft)
          .map((r) => ({ tag: r.tag_name, date: r.published_at?.slice(0, 10), prerelease: !!r.prerelease }));
        // A repo with no releases yet keeps its fallback (e.g. the Kit's 0.1.0).
        if (list.length) {
          setState({ releases: list, live: true });
          writeCache(key, list);
        }
      })
      .catch(() => {
        /* offline, blocked or rate-limited — keep the fallback */
      });
    return () => ctrl.abort();
  }, [key, repo, state.live]);

  return state;
}

/** Platform docs (/docs) — fallback is the real release list as of this build. */
export const PLATFORM_VERSIONS: VersionSource = {
  repo: "adhar-io/adhar",
  docsPath: "docs",
  fallback: [
    { tag: "v0.1.43", date: "2026-10-17" },
    { tag: "v0.1.42", date: "2026-10-16" },
    { tag: "v0.1.40", date: "2026-10-13" },
    { tag: "v0.1.39", date: "2026-10-11" },
    { tag: "v0.1.38", date: "2026-10-10" },
    { tag: "v0.1.37", date: "2026-10-10" },
    { tag: "v0.1.36", date: "2026-10-10" },
    { tag: "v0.1.35", date: "2026-10-09" },
  ],
};

/** Adhar Kit docs (/adhar-kit) — no GitHub releases yet; the poms are at 0.1.0. */
export const KIT_VERSIONS: VersionSource = {
  repo: "adhar-io/adhar-kit",
  docsPath: "",
  fallback: [{ tag: "0.1.0" }],
};
