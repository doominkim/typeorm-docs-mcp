# typeorm-docs-mcp MVP Design

## Background

`typeorm-docs-mcp` is not a thin wrapper around AI reading entity files. It provides deterministic scripts and MCP tools that extract TypeORM schema information into a stable graph, then generate ERD, Markdown documentation, and design-review signals from that graph.

## Goal

Build an offline-first TypeORM schema documentation tool that can be used by both people and AI clients:

- Users can run a CLI to generate Mermaid ERD or Markdown docs.
- AI clients can call MCP tools to obtain schema context and design-review reports.
- No database credentials or live DB connection are required for the MVP.

## Clean-room Constraint

The project may adopt product ideas from `samchon/prisma-markdown` such as ORM-to-docs, Mermaid ERD, chapter tags, and hidden/schema section concepts. It must not copy code, file structure, tests, internal algorithms, README wording, or implementation names from that repository.

## MVP Scope

### Included

- Offline TypeScript source analysis for TypeORM entities.
- JSDoc description and tag parsing.
- Canonical `SchemaGraph` JSON output.
- Mermaid `erDiagram` generation.
- Markdown documentation generation.
- Undocumented schema audit.
- CLI/script usage.
- MCP stdio server with four tools:
  - `analyze_typeorm_schema`
  - `generate_mermaid_erd`
  - `generate_typeorm_markdown`
  - `find_undocumented_schema`

### Excluded

- Live `DataSource.initialize()` introspection.
- Database credentials or network access.
- Migration diff analysis.
- HTML documentation sites.
- Direct LLM API calls inside the MCP server.

## Architecture

```text
TypeORM entity files
  -> file resolver
  -> TypeScript AST analyzer
  -> JSDoc/tag parser
  -> SchemaGraph
  -> renderers/auditors
  -> CLI + MCP tools
```

## CLI UX

```bash
typeorm-docs-mcp analyze --entities "src/**/*.entity.ts"
typeorm-docs-mcp erd --entities "src/**/*.entity.ts"
typeorm-docs-mcp markdown --entities "src/**/*.entity.ts" --title "Schema" --output ERD.md
typeorm-docs-mcp audit --entities "src/**/*.entity.ts"
typeorm-docs-mcp serve
```

## SchemaGraph Shape

The graph contains `tables`, each with normalized table name, entity name, source file, tags, columns, and relations. Columns capture database name, property name, inferred type, primary/unique/nullable flags, and JSDoc description. Relations capture property name, relation kind, target entity/table, join columns, and JSDoc description.

## Design Review Use Case

The audit output is intentionally machine-readable so users and AI can use it for DB design review. It reports missing table, column, and relation descriptions without requiring a live DB.
