import { describe, expect, it } from "vitest";
import { findUndocumentedSchema } from "../src/audit/find-undocumented-schema";
import { analyzeTypeormSchema } from "../src/analyzer/analyze-typeorm-schema";
import { generateMermaidErd } from "../src/renderers/generate-mermaid-erd";
import { generateTypeormMarkdown } from "../src/renderers/generate-typeorm-markdown";

describe("schema renderers", () => {
  it("generates Mermaid ERD from the analyzed schema graph", async () => {
    const graph = await analyzeTypeormSchema({
      entities: "test/fixtures/**/*.entity.ts",
      projectRoot: process.cwd(),
    });

    const erd = generateMermaidErd(graph);

    expect(erd).toContain("erDiagram");
    expect(erd).toContain("users {");
    expect(erd).toContain("varchar display_name");
    expect(erd).toContain("blog_posts }o--|| users : author");
  });

  it("generates Markdown documentation with sections, ERD, columns, and relations", async () => {
    const graph = await analyzeTypeormSchema({
      entities: "test/fixtures/**/*.entity.ts",
      projectRoot: process.cwd(),
    });

    const markdown = generateTypeormMarkdown(graph, { title: "Blog Schema" });

    expect(markdown).toContain("# Blog Schema");
    expect(markdown).toContain("## Blog");
    expect(markdown).toContain("```mermaid");
    expect(markdown).toContain("### `blog_posts`");
    expect(markdown).toContain("| `author_id` | `uuid` | FK | No | 작성자 ID |");
    expect(markdown).toContain("- `author` → `users`");
  });

  it("reports undocumented tables, columns, and relations for design review", async () => {
    const graph = await analyzeTypeormSchema({
      entities: "test/fixtures/**/*.entity.ts",
      projectRoot: process.cwd(),
    });

    const audit = findUndocumentedSchema(graph);

    expect(audit.missingTableDescriptions).toEqual([]);
    expect(audit.missingColumnDescriptions).toContain("users.passwordHash");
    expect(audit.missingColumnDescriptions).toContain("blog_posts.body");
    expect(audit.missingRelationDescriptions).toEqual([]);
  });
});
