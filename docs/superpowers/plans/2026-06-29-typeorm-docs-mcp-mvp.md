# typeorm-docs-mcp MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first TypeORM docs MCP package with a real CLI/script path and MCP tools for schema analysis, ERD generation, Markdown generation, and documentation audits.

**Architecture:** TypeScript entity files are parsed with the TypeScript compiler API into a canonical `SchemaGraph`. Renderers and auditors consume the graph, and both CLI commands and MCP tools call the same core functions.

**Tech Stack:** TypeScript, Vitest, `fast-glob`, `@modelcontextprotocol/sdk`, `zod`, Node.js ESM.

---

### Task 1: Project scaffold and failing tests

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `test/fixtures/blog.entity.ts`
- Create: `test/fixtures/user.entity.ts`
- Create: `test/schema-analyzer.test.ts`
- Create: `test/renderers.test.ts`
- Create: `test/cli.test.ts`

- [ ] Create package/test configuration and fixture entity files.
- [ ] Write tests that import `analyzeTypeormSchema`, `generateMermaidErd`, `generateTypeormMarkdown`, and `findUndocumentedSchema` before production files exist.
- [ ] Run `npm test` and confirm the tests fail because source modules are missing.

### Task 2: Core schema graph analyzer

**Files:**
- Create: `src/schema/schema-graph.ts`
- Create: `src/analyzer/analyze-typeorm-schema.ts`
- Create: `src/analyzer/parse-jsdoc.ts`
- Create: `src/analyzer/ast-utils.ts`
- Create: `src/analyzer/name-utils.ts`

- [ ] Implement focused helpers for TypeScript AST decorator parsing.
- [ ] Extract entity, column, relation, JSDoc description, and tags into `SchemaGraph`.
- [ ] Run `npm test -- test/schema-analyzer.test.ts` and confirm analyzer tests pass.

### Task 3: Renderers and audit

**Files:**
- Create: `src/renderers/generate-mermaid-erd.ts`
- Create: `src/renderers/generate-typeorm-markdown.ts`
- Create: `src/audit/find-undocumented-schema.ts`
- Create: `src/sections/collect-schema-sections.ts`

- [ ] Implement deterministic Mermaid ERD output from `SchemaGraph`.
- [ ] Implement Markdown output with sections, ERD blocks, table descriptions, column tables, and relation lists.
- [ ] Implement missing-description audit output.
- [ ] Run renderer/audit tests and confirm they pass.

### Task 4: CLI and MCP tools

**Files:**
- Create: `src/cli.ts`
- Create: `src/mcp/server.ts`
- Create: `src/index.ts`

- [ ] Implement CLI commands: `analyze`, `erd`, `markdown`, `audit`, `serve`.
- [ ] Implement MCP stdio server exposing four tools that call the same core functions as the CLI.
- [ ] Run CLI tests and direct CLI smoke checks.

### Task 5: Verification and docs

**Files:**
- Create: `README.md`

- [ ] Document clean-room scope, CLI usage, MCP usage, and offline-only MVP limits.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run CLI smoke checks for ERD and Markdown output.
