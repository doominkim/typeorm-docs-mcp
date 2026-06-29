import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { findUndocumentedSchema } from "../audit/find-undocumented-schema.js";
import { analyzeTypeormSchema } from "../analyzer/analyze-typeorm-schema.js";
import { generateMermaidErd } from "../renderers/generate-mermaid-erd.js";
import { generateTypeormMarkdown } from "../renderers/generate-typeorm-markdown.js";

const schemaInput = z.object({
  entities: z.union([z.string(), z.array(z.string())]),
  projectRoot: z.string().optional(),
});

const markdownInput = schemaInput.extend({
  title: z.string().optional(),
});

export const createMcpServer = (): McpServer => {
  const server = new McpServer({
    name: "typeorm-docs-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "analyze_typeorm_schema",
    {
      title: "Analyze TypeORM Schema",
      description: "Analyze TypeORM entity files into a canonical schema graph JSON.",
      inputSchema: schemaInput,
    },
    async (input) => {
      const graph = await analyzeTypeormSchema(input);
      return jsonToolResult(graph);
    },
  );

  server.registerTool(
    "generate_mermaid_erd",
    {
      title: "Generate Mermaid ERD",
      description: "Generate a Mermaid erDiagram from TypeORM entity files.",
      inputSchema: schemaInput,
    },
    async (input) => {
      const graph = await analyzeTypeormSchema(input);
      return textToolResult(generateMermaidErd(graph));
    },
  );

  server.registerTool(
    "generate_typeorm_markdown",
    {
      title: "Generate TypeORM Markdown",
      description: "Generate Markdown documentation from TypeORM entity files.",
      inputSchema: markdownInput,
    },
    async (input) => {
      const graph = await analyzeTypeormSchema(input);
      return textToolResult(generateTypeormMarkdown(graph, { title: input.title }));
    },
  );

  server.registerTool(
    "find_undocumented_schema",
    {
      title: "Find Undocumented Schema",
      description: "Report tables, columns, and relations missing JSDoc descriptions.",
      inputSchema: schemaInput,
    },
    async (input) => {
      const graph = await analyzeTypeormSchema(input);
      return jsonToolResult(findUndocumentedSchema(graph));
    },
  );

  return server;
};

export const startMcpServer = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await createMcpServer().connect(transport);
};

const textToolResult = (text: string) => ({
  content: [{ type: "text" as const, text }],
});

const jsonToolResult = (value: unknown) => textToolResult(JSON.stringify(value, null, 2));
