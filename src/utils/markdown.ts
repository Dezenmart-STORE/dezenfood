import GithubSlugger from "github-slugger";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Extract section headings from markdown for a table of contents.
 * Slugs are generated with github-slugger in document order so they match the
 * ids rehype-slug puts on the rendered headings (needed for anchor links).
 * Only h2 headings are returned - the top-level sections of a legal document.
 */
export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  let inCodeFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    // Slug every heading (h1..h6) so the slugger's duplicate counter stays in
    // sync with rehype-slug, even though only h2s go into the TOC.
    const id = slugger.slug(match[2].trim());
    if (level === 2) headings.push({ id, text: match[2].trim(), level });
  }

  return headings;
}
