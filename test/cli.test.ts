import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli";

describe("runCli", () => {
  it("prints Mermaid ERD for users who want a scriptable output", async () => {
    const stdout: string[] = [];

    const exitCode = await runCli(
      ["erd", "--entities", "test/fixtures/**/*.entity.ts"],
      { cwd: process.cwd(), stdout: (text) => stdout.push(text), stderr: () => undefined },
    );

    expect(exitCode).toBe(0);
    expect(stdout.join("")).toContain("blog_posts }o--|| users : author");
  });

  it("writes Markdown documentation to a file", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "typeorm-docs-mcp-"));
    const output = path.join(tmp, "schema.md");

    const exitCode = await runCli(
      [
        "markdown",
        "--entities",
        "test/fixtures/**/*.entity.ts",
        "--title",
        "Fixture Schema",
        "--output",
        output,
      ],
      { cwd: process.cwd(), stdout: () => undefined, stderr: () => undefined },
    );

    const content = await fs.readFile(output, "utf8");
    expect(exitCode).toBe(0);
    expect(content).toContain("# Fixture Schema");
    expect(content).toContain("### `users`");
  });
});
