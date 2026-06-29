import type { SchemaGraph, SchemaTable } from "../schema/schema-graph.js";

export const generateMermaidErd = (
  graph: SchemaGraph,
  options: { tables?: SchemaTable[] } = {},
): string => {
  const tables = options.tables ?? graph.tables.filter((table) => !table.tags.hidden);
  const tableNames = new Set(tables.map((table) => table.name));
  const lines: string[] = ["```mermaid", "erDiagram"];

  for (const table of tables) {
    lines.push(`${table.name} {`);
    for (const column of table.columns) {
      lines.push(
        `  ${column.type} ${column.name}${columnKey(column)}${column.nullable ? ' "nullable"' : ""}`,
      );
    }
    lines.push("}");
  }

  for (const table of tables) {
    for (const relation of table.relations) {
      if (relation.targetTable === null || !tableNames.has(relation.targetTable)) continue;
      if (!shouldWriteRelation(relation.type, relation.owning)) continue;
      lines.push(
        `${table.name} ${relationArrow(relation.type)} ${relation.targetTable} : ${relation.propertyName}`,
      );
    }
  }

  lines.push("```");
  return lines.join("\n");
};

const columnKey = (column: { primaryKey: boolean; foreignKey: boolean; unique: boolean }): string => {
  const keys = [
    column.primaryKey ? "PK" : "",
    column.foreignKey ? "FK" : "",
    column.unique ? "UK" : "",
  ].filter((value) => value.length > 0);
  return keys.length === 0 ? "" : ` ${keys.join(",")}`;
};

const shouldWriteRelation = (type: string, owning: boolean): boolean => {
  if (type === "one-to-many") return false;
  if (type === "many-to-many") return owning;
  return true;
};

const relationArrow = (type: string): string => {
  switch (type) {
    case "one-to-one":
      return "|o--||";
    case "many-to-many":
      return "}o--o{";
    default:
      return "}o--||";
  }
};
