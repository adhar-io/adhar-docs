/**
 * Status pills for docs pages. Write a status as inline code in markdown —
 * `status:complete`, `status:in-progress`, `status:blocked`, `status:planned` —
 * and the renderer draws a coloured pill; search indexes the label instead.
 *
 * `mark` fills dots and bars. The four 600 steps pass the dataviz palette
 * checks (lightness, chroma, CVD separation, 3:1 contrast) on both the light
 * and the dark surface, so the same step serves both themes.
 */
export const DOC_STATUSES = {
  complete: {
    label: "Complete",
    pill: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 ring-emerald-500/25",
    mark: "bg-emerald-600",
  },
  "in-progress": {
    label: "In progress",
    pill: "text-orange-700 dark:text-orange-400 bg-orange-500/10 ring-orange-500/25",
    mark: "bg-orange-600",
  },
  blocked: {
    label: "Blocked",
    pill: "text-rose-700 dark:text-rose-400 bg-rose-500/10 ring-rose-500/25",
    mark: "bg-rose-600",
  },
  planned: {
    label: "Planned",
    pill: "text-sky-700 dark:text-sky-400 bg-sky-500/10 ring-sky-500/25",
    mark: "bg-sky-600",
  },
} as const;

export type DocStatus = keyof typeof DOC_STATUSES;

function isStatus(key: string): key is DocStatus {
  return Object.prototype.hasOwnProperty.call(DOC_STATUSES, key);
}

/** The status named by an inline-code token such as `status:complete`, or null. */
export function parseStatus(text: string): DocStatus | null {
  const key = /^status:([a-z-]+)$/.exec(text.trim())?.[1];
  return key && isStatus(key) ? key : null;
}

/** Replace `status:<key>` tokens in raw markdown with their plain label. */
export function statusTokensToText(md: string): string {
  return md.replace(/`status:([a-z-]+)`/g, (token, key: string) =>
    isStatus(key) ? DOC_STATUSES[key].label : token,
  );
}
