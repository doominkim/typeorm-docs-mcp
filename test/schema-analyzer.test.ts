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
});
