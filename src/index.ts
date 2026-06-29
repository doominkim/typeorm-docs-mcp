export type {
  AnalyzeTypeormSchemaInput,
  SchemaColumn,
  SchemaGraph,
  SchemaRelation,
  SchemaRelationType,
  SchemaTable,
  SchemaTags,
} from "./schema/schema-graph.js";
export { analyzeTypeormSchema } from "./analyzer/analyze-typeorm-schema.js";
export { findUndocumentedSchema } from "./audit/find-undocumented-schema.js";
export { generateMermaidErd } from "./renderers/generate-mermaid-erd.js";
export { generateTypeormMarkdown } from "./renderers/generate-typeorm-markdown.js";
export { createMcpServer, startMcpServer } from "./mcp/server.js";
