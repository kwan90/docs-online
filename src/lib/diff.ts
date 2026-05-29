import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

export interface DiffPart {
  text: string;
  type: "added" | "removed" | "unchanged";
}

/**
 * Strips HTML tags from a string to get plain text.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

/**
 * Computes a character-level diff between two strings.
 * Strips HTML tags before diffing for cleaner output.
 */
export function computeDiff(oldText: string, newText: string): DiffPart[] {
  const oldPlain = stripHtml(oldText);
  const newPlain = stripHtml(newText);

  const diffs = dmp.diff_main(oldPlain, newPlain);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, text]) => ({
    text,
    type: op === 1 ? "added" : op === -1 ? "removed" : "unchanged",
  }));
}

/**
 * Returns a summary of the diff (e.g., "+3, -1 lines").
 */
export function getDiffSummary(parts: DiffPart[]): string {
  let added = 0;
  let removed = 0;

  for (const part of parts) {
    if (part.type === "added") added++;
    if (part.type === "removed") removed++;
  }

  if (added === 0 && removed === 0) return "No changes";
  if (added > 0 && removed === 0) return `+${added} change${added > 1 ? "s" : ""}`;
  if (added === 0 && removed > 0) return `-${removed} change${removed > 1 ? "s" : ""}`;
  return `+${added}, -${removed} changes`;
}
