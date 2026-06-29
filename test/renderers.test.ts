import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

  it("reports missing column descriptions by schema column name", () => {
    const audit = findUndocumentedSchema({
      projectRoot: process.cwd(),
      patterns: [],
      tables: [
        {
          name: "users",
          entityName: "User",
          file: "user.entity.ts",
          description: "서비스 사용자 계정.",
          tags: { namespace: [], erd: [], describe: [], hidden: false },
          columns: [
            {
              propertyName: "displayName",
              name: "display_name",
              type: "varchar",
              primaryKey: false,
              generated: false,
              unique: false,
              nullable: false,
              foreignKey: false,
              foreignKeyTargetTable: null,
              description: "",
            },
          ],
          relations: [],
        },
      ],
    });

    expect(audit.missingColumnDescriptions).toEqual(["users.display_name"]);
  });

  it("generates ManyToMany ERD relations from the JoinTable owning side", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "typeorm-docs-mcp-"));
    await writeFile(
      path.join(projectRoot, "membership.entity.ts"),
      `import { Entity, JoinTable, ManyToMany, PrimaryColumn } from "typeorm";

/** 서비스 사용자. */
@Entity("users")
export class User {
  /** 사용자 ID */
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  /** 사용자 역할 목록 */
  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable()
  roles!: Role[];
}

/** 권한 역할. */
@Entity("roles")
export class Role {
  /** 역할 ID */
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  /** 역할을 가진 사용자 목록 */
  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];
}
`,
    );
    const graph = await analyzeTypeormSchema({
      entities: "*.entity.ts",
      projectRoot,
    });

    const erd = generateMermaidErd(graph);

    expect(erd).toContain("users }o--o{ roles : roles");
    expect(erd).not.toContain("roles }o--o{ users : users");
  });
});
