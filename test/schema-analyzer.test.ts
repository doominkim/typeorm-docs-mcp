import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeTypeormSchema } from "../src/analyzer/analyze-typeorm-schema";

describe("analyzeTypeormSchema", () => {
  it("extracts TypeORM entities, columns, relations, JSDoc descriptions, and tags", async () => {
    const graph = await analyzeTypeormSchema({
      entities: "test/fixtures/**/*.entity.ts",
      projectRoot: process.cwd(),
    });

    expect(graph.tables.map((table) => table.name).sort()).toEqual([
      "blog_posts",
      "users",
    ]);

    const user = graph.tables.find((table) => table.entityName === "User");
    expect(user).toMatchObject({
      name: "users",
      description: "서비스 사용자 계정.",
      tags: {
        namespace: ["Accounts"],
        erd: ["Blog"],
      },
    });
    expect(user?.columns.find((column) => column.propertyName === "displayName")).toMatchObject({
      name: "display_name",
      type: "varchar",
      nullable: false,
      description: "표시 이름",
    });
    expect(user?.columns.find((column) => column.propertyName === "email")).toMatchObject({
      unique: true,
      description: "로그인 이메일",
    });

    const post = graph.tables.find((table) => table.entityName === "BlogPost");
    expect(post?.columns.find((column) => column.propertyName === "title")).toMatchObject({
      nullable: true,
      type: "varchar",
    });
    expect(post?.columns.find((column) => column.propertyName === "authorId")).toMatchObject({
      foreignKey: true,
      foreignKeyTargetTable: "users",
    });
    expect(post?.relations).toContainEqual(
      expect.objectContaining({
        propertyName: "author",
        type: "many-to-one",
        targetEntity: "User",
        targetTable: "users",
        joinColumns: ["author_id"],
        description: "게시글 작성자",
      }),
    );
  });

  it("does not infer database nullability from TypeScript union types", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "typeorm-docs-mcp-"));
    await writeFile(
      path.join(projectRoot, "profile.entity.ts"),
      `import { Column, Entity, PrimaryColumn } from "typeorm";

/** 사용자 프로필. */
@Entity("profiles")
export class Profile {
  /** 프로필 ID */
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  /** 별명 */
  @Column({ type: "varchar" })
  nickname!: string | null;

  /** 소개 */
  @Column({ type: "varchar", nullable: true })
  bio!: string;
}
`,
    );

    const graph = await analyzeTypeormSchema({
      entities: "*.entity.ts",
      projectRoot,
    });

    const profile = graph.tables.find((table) => table.entityName === "Profile");
    expect(profile?.columns.find((column) => column.propertyName === "nickname")).toMatchObject({
      nullable: false,
    });
    expect(profile?.columns.find((column) => column.propertyName === "bio")).toMatchObject({
      nullable: true,
    });
  });
});
