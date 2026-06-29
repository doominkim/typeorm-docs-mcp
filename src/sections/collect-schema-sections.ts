import type { SchemaGraph, SchemaTable } from "../schema/schema-graph.js";

export interface SchemaSection {
  name: string;
  erdTables: SchemaTable[];
  descriptionTables: SchemaTable[];
}

interface MutableSchemaSection {
  name: string;
  erdTables: Map<string, SchemaTable>;
  descriptionTables: Map<string, SchemaTable>;
}

const DEFAULT_SECTION = "Default";

export const collectSchemaSections = (graph: SchemaGraph): SchemaSection[] => {
  const sections = new Map<string, MutableSchemaSection>();

  for (const table of graph.tables.filter((table) => !table.tags.hidden)) {
    const sectionNames = [
      ...table.tags.namespace,
      ...table.tags.erd,
      ...table.tags.describe,
    ];
    if (sectionNames.length === 0) {
      addBoth(sections, DEFAULT_SECTION, table);
      continue;
    }
    for (const namespace of table.tags.namespace) addBoth(sections, namespace, table);
    for (const erd of table.tags.erd) addErd(sections, erd, table);
    for (const describe of table.tags.describe) addDescription(sections, describe, table);
  }

  return [...sections.values()]
    .sort((a, b) => sectionSortName(a.name).localeCompare(sectionSortName(b.name)))
    .map((section) => ({
      name: section.name,
      erdTables: [...section.erdTables.values()].sort((a, b) => a.name.localeCompare(b.name)),
      descriptionTables: [...section.descriptionTables.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }));
};

const addBoth = (sections: Map<string, MutableSchemaSection>, name: string, table: SchemaTable) => {
  addErd(sections, name, table);
  addDescription(sections, name, table);
};

const addErd = (sections: Map<string, MutableSchemaSection>, name: string, table: SchemaTable) => {
  takeSection(sections, name).erdTables.set(table.name, table);
};

const addDescription = (
  sections: Map<string, MutableSchemaSection>,
  name: string,
  table: SchemaTable,
) => {
  takeSection(sections, name).descriptionTables.set(table.name, table);
};

const takeSection = (sections: Map<string, MutableSchemaSection>, name: string) => {
  const existing = sections.get(name);
  if (existing !== undefined) return existing;
  const created: MutableSchemaSection = {
    name,
    erdTables: new Map(),
    descriptionTables: new Map(),
  };
  sections.set(name, created);
  return created;
};

const sectionSortName = (name: string): string => (name === DEFAULT_SECTION ? "~" : name);
