import ts from "typescript";

export interface ParsedJSDoc {
  description: string;
  tags: Record<string, string[]>;
}

export const parseLeadingJSDoc = (
  sourceText: string,
  node: ts.Node,
): ParsedJSDoc => {
  const ranges = ts.getLeadingCommentRanges(sourceText, node.pos) ?? [];
  const jsdoc = ranges
    .map((range) => sourceText.slice(range.pos, range.end))
    .filter((comment) => comment.trimStart().startsWith("/**"))
    .at(-1);

  if (jsdoc === undefined) return { description: "", tags: {} };
  return parseJSDocBlock(jsdoc);
};

export const parseJSDocBlock = (block: string): ParsedJSDoc => {
  const lines = block
    .replace(/^\s*\/\*\*/, "")
    .replace(/\*\/\s*$/, "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*\s?/, ""));

  const descriptionLines: string[] = [];
  const tags: Record<string, string[]> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("@")) {
      const [tagWithAt, ...rest] = trimmed.split(/\s+/);
      const tag = tagWithAt.slice(1);
      const value = rest.join(" ").trim();
      tags[tag] = [...(tags[tag] ?? []), value];
      continue;
    }
    descriptionLines.push(line);
  }

  return {
    description: trimBlankLines(descriptionLines).join("\n").trim(),
    tags,
  };
};

const trimBlankLines = (lines: string[]): string[] => {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start += 1;
  while (end > start && lines[end - 1].trim() === "") end -= 1;
  return lines.slice(start, end);
};
