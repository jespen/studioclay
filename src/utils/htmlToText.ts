const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Turns stored rich text into a single readable line for lists and previews.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';

  const withoutTags = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');

  const decoded = withoutTags.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
    const key = body.toLowerCase();
    if (key.startsWith('#x')) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    if (key.startsWith('#')) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[key] ?? entity;
  });

  return decoded.replace(/\s+/g, ' ').trim();
}
