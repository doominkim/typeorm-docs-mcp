import type { SchemaGraph } from "../schema/schema-graph.js";

export interface UndocumentedSchemaReport {
  missingTableDescriptions: string[];
  missingColumnDescriptions: string[];
  missingRelationDescriptions: string[];
}

export const findUndocumentedSchema = (graph: SchemaGraph): UndocumentedSchemaReport => {
  const report: UndocumentedSchemaReport = {
    missingTableDescriptions: [],
    missingColumnDescriptions: [],
    missingRelationDescriptions: [],
  };

  for (const table of graph.tables.filter((table) => !table.tags.hidden)) {
    if (table.description.trim().length === 0) report.missingTableDescriptions.push(table.name);
    for (const column of table.columns) {
      if (column.description.trim().length === 0) {
        report.missingColumnDescriptions.push(`${table.name}.${column.name}`);
      }
    }
    for (const relation of table.relations) {
      if (relation.description.trim().length === 0) {
        report.missingRelationDescriptions.push(`${table.name}.${relation.propertyName}`);
      }
    }
  }

  return report;
};
