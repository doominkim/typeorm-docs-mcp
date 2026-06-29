#!/usr/bin/env node
import { realpathSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findUndocumentedSchema } from "./audit/find-undocumented-schema.js";
import { analyzeTypeormSchema } from "./analyzer/analyze-typeorm-schema.js";
import { startMcpServer } from "./mcp/server.js";
import { generateMermaidErd } from "./renderers/generate-mermaid-erd.js";
import { generateTypeormMarkdown } from "./renderers/generate-typeorm-markdown.js";

export interface CliIO {
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

type CliCommand = "analyze" | "erd" | "markdown" | "audit" | "serve" | "help";

interface ParsedCliArgs {
  command: CliCommand;
  flags: Map<string, string>;
}

const DEFAULT_IO: CliIO = {
  cwd: process.cwd(),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

export const runCli = async (
  argv: string[],
  io: Partial<CliIO> = {},
): Promise<number> => {
  const runtime = { ...DEFAULT_IO, ...io };
  const parsed = parseCliArgs(argv);

  if (parsed.command === "help") {
    runtime.stdout(helpText());
    return 0;
  }

  if (parsed.command === "serve") {
    await startMcpServer();
    return 0;
  }

  const entities = parsed.flags.get("entities");
  if (entities === undefined || entities.trim().length === 0) {
    runtime.stderr("Missing required --entities <glob> option.\n");
    return 1;
  }

  const graph = await analyzeTypeormSchema({ entities, projectRoot: runtime.cwd });

  if (parsed.command === "analyze") {
    runtime.stdout(`${JSON.stringify(graph, null, 2)}\n`);
    return 0;
  }

  if (parsed.command === "erd") {
    runtime.stdout(`${generateMermaidErd(graph)}\n`);
    return 0;
  }

  if (parsed.command === "audit") {
    runtime.stdout(`${JSON.stringify(findUndocumentedSchema(graph), null, 2)}\n`);
    return 0;
  }

  const markdown = generateTypeormMarkdown(graph, {
    title: parsed.flags.get("title") ?? "TypeORM Schema",
  });
  const output = parsed.flags.get("output");
  if (output === undefined) {
    runtime.stdout(markdown);
    return 0;
  }
  const outputPath = path.resolve(runtime.cwd, output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown, "utf8");
  runtime.stdout(`Wrote ${outputPath}\n`);
  return 0;
};

const parseCliArgs = (argv: string[]): ParsedCliArgs => {
  const [first = "help", ...rest] = argv;
  const command = toCommand(first);
  const flags = new Map<string, string>();

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      flags.set(key, "true");
      continue;
    }
    flags.set(key, value);
    index += 1;
  }

  return { command, flags };
};

const toCommand = (value: string): CliCommand => {
  if (["analyze", "erd", "markdown", "audit", "serve"].includes(value)) {
    return value as CliCommand;
  }
  return "help";
};

const helpText = (): string => `typeorm-docs-mcp

Usage:
  typeorm-docs-mcp analyze --entities "src/**/*.entity.ts"
  typeorm-docs-mcp erd --entities "src/**/*.entity.ts"
  typeorm-docs-mcp markdown --entities "src/**/*.entity.ts" --title "Schema" --output ERD.md
  typeorm-docs-mcp audit --entities "src/**/*.entity.ts"
  typeorm-docs-mcp serve
`;

export const isCliEntrypoint = (
  argvEntry: string | undefined,
  moduleUrl: string,
): boolean => {
  if (argvEntry === undefined) return false;

  const modulePath = fileURLToPath(moduleUrl);
  try {
    return realpathSync(argvEntry) === realpathSync(modulePath);
  } catch (error) {
    void error;
    return pathToFileURL(argvEntry).href === moduleUrl;
  }
};

if (isCliEntrypoint(process.argv[1], import.meta.url)) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}
