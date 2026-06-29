import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/mcp/server";

describe("createMcpServer", () => {
  it("exposes schema analysis and documentation tools to MCP clients", async () => {
    const server = createMcpServer();
    const client = new Client({ name: "typeorm-docs-mcp-test", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "analyze_typeorm_schema",
        "find_undocumented_schema",
        "generate_mermaid_erd",
        "generate_typeorm_markdown",
      ]);

      const toolInput = {
        entities: "test/fixtures/**/*.entity.ts",
        projectRoot: process.cwd(),
      };

      const analysis = await client.callTool(
        {
          name: "analyze_typeorm_schema",
          arguments: toolInput,
        },
        CallToolResultSchema,
      );
      const analysisText = firstTextContent(analysis);
      expect(JSON.parse(analysisText).tables).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "blog_posts" })]),
      );

      const erd = await client.callTool(
        {
          name: "generate_mermaid_erd",
          arguments: toolInput,
        },
        CallToolResultSchema,
      );

      const parsedErd = CallToolResultSchema.parse(erd);
      const first = parsedErd.content[0];
      expect(first?.type).toBe("text");
      expect(first?.type === "text" ? first.text : "").toContain(
        "blog_posts }o--|| users : author",
      );

      const markdown = await client.callTool(
        {
          name: "generate_typeorm_markdown",
          arguments: { ...toolInput, title: "Fixture Schema" },
        },
        CallToolResultSchema,
      );
      const markdownText = firstTextContent(markdown);
      expect(markdownText).toContain("# Fixture Schema");
      expect(markdownText).toContain("### `blog_posts`");

      const audit = await client.callTool(
        {
          name: "find_undocumented_schema",
          arguments: toolInput,
        },
        CallToolResultSchema,
      );
      const auditText = firstTextContent(audit);
      expect(JSON.parse(auditText).missingColumnDescriptions).toEqual(
        expect.arrayContaining(["blog_posts.body", "users.passwordHash"]),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});

const firstTextContent = (result: unknown): string => {
  const parsed = CallToolResultSchema.parse(result);
  const first = parsed.content[0];
  return first?.type === "text" ? first.text : "";
};
