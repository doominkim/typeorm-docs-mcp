import path from "node:path";
import fg from "fast-glob";
import ts from "typescript";
import {
  findDecoratorCall,
  firstObjectArgument,
  propertyNameOf,
  readObjectBooleanProperty,
  readObjectStringProperty,
  readStringExpression,
  relationInverseSide,
  relationTargetName,
  typeTextOf,
} from "./ast-utils.js";
import { toSnakeCase, uniqueValues } from "./name-utils.js";
import { parseLeadingJSDoc } from "./parse-jsdoc.js";
import type {
  AnalyzeTypeormSchemaInput,
  SchemaColumn,
  SchemaGraph,
  SchemaRelation,
  SchemaRelationType,
  SchemaTable,
  SchemaTags,
} from "../schema/schema-graph.js";

const ENTITY_DECORATORS = ["Entity"] as const;
const COLUMN_DECORATORS = [
  "Column",
  "PrimaryColumn",
  "PrimaryGeneratedColumn",
  "CreateDateColumn",
  "UpdateDateColumn",
  "DeleteDateColumn",
] as const;
const RELATION_DECORATORS = ["OneToOne", "OneToMany", "ManyToOne", "ManyToMany"] as const;

export const analyzeTypeormSchema = async (
  input: AnalyzeTypeormSchemaInput,
): Promise<SchemaGraph> => {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const patterns = Array.isArray(input.entities) ? input.entities : [input.entities];
  const files = await fg(patterns, {
    cwd: projectRoot,
    absolute: true,
    onlyFiles: true,
  });

  const tables = files.flatMap((file) => analyzeFile(projectRoot, file));
  const tableByEntity = new Map(tables.map((table) => [table.entityName, table]));

  for (const table of tables) {
    for (const relation of table.relations) {
      relation.targetTable = tableByEntity.get(relation.targetEntity)?.name ?? null;
      for (const joinColumn of relation.joinColumns) {
        const column = table.columns.find((candidate) => candidate.name === joinColumn);
        if (column !== undefined) {
          column.foreignKey = true;
          column.foreignKeyTargetTable = relation.targetTable;
        }
      }
    }
  }

  return {
    projectRoot,
    patterns,
    tables: tables.sort((a, b) => a.name.localeCompare(b.name)),
  };
};

const analyzeFile = (projectRoot: string, file: string): SchemaTable[] => {
  const sourceText = ts.sys.readFile(file);
  if (sourceText === undefined) return [];

  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const tables: SchemaTable[] = [];

  sourceFile.forEachChild((node) => {
    if (!ts.isClassDeclaration(node) || node.name === undefined) return;
    const entityDecorator = findDecoratorCall(node, ENTITY_DECORATORS);
    if (entityDecorator === undefined) return;

    const jsdoc = parseLeadingJSDoc(sourceText, node);
    const entityName = node.name.text;
    const entityOptions = firstObjectArgument(entityDecorator.call);
    const explicitName = readEntityName(entityDecorator.call, entityOptions);

    const table: SchemaTable = {
      name: explicitName ?? toSnakeCase(entityName),
      entityName,
      file: path.relative(projectRoot, file),
      description:
        jsdoc.description || readObjectStringProperty(entityOptions, "comment") || "",
      tags: normalizeTags(jsdoc.tags),
      columns: [],
      relations: [],
    };

    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;
      const propertyName = propertyNameOf(member);
      if (propertyName === null) continue;
      const memberJSDoc = parseLeadingJSDoc(sourceText, member);

      const column = analyzeColumn(member, propertyName, memberJSDoc.description);
      if (column !== null) table.columns.push(column);

      const relation = analyzeRelation(member, propertyName, memberJSDoc.description);
      if (relation !== null) table.relations.push(relation);
    }

    tables.push(table);
  });

  return tables;
};

const readEntityName = (
  call: ts.CallExpression,
  object: ts.ObjectLiteralExpression | undefined,
): string | undefined => {
  const first = call.arguments[0];
  if (first !== undefined) {
    const value = readStringExpression(first);
    if (value !== undefined) return value;
  }
  return readObjectStringProperty(object, "name");
};

const normalizeTags = (tags: Record<string, string[]>): SchemaTags => ({
  namespace: uniqueValues(tags.namespace ?? []),
  erd: uniqueValues(tags.erd ?? []),
  describe: uniqueValues(tags.describe ?? []),
  hidden: (tags.hidden ?? []).length > 0,
});

const analyzeColumn = (
  member: ts.PropertyDeclaration,
  propertyName: string,
  description: string,
): SchemaColumn | null => {
  const decorator = findDecoratorCall(member, COLUMN_DECORATORS);
  if (decorator === undefined) return null;

  const options = firstObjectArgument(decorator.call);
  const explicitName = readObjectStringProperty(options, "name");
  const optionType = readObjectStringProperty(options, "type");
  const firstArg = decorator.call.arguments[0];
  const firstArgType = firstArg === undefined ? undefined : readStringExpression(firstArg);
  const tsType = typeTextOf(member);
  const primaryKey = decorator.name === "PrimaryColumn" || decorator.name === "PrimaryGeneratedColumn";

  return {
    propertyName,
    name: explicitName ?? propertyName,
    type: optionType ?? firstArgType ?? inferredColumnType(decorator.name, tsType),
    primaryKey,
    generated: decorator.name === "PrimaryGeneratedColumn",
    unique: readObjectBooleanProperty(options, "unique") ?? false,
    nullable: readObjectBooleanProperty(options, "nullable") ?? false,
    foreignKey: false,
    foreignKeyTargetTable: null,
    description: description || readObjectStringProperty(options, "comment") || "",
  };
};

const analyzeRelation = (
  member: ts.PropertyDeclaration,
  propertyName: string,
  description: string,
): SchemaRelation | null => {
  const decorator = findDecoratorCall(member, RELATION_DECORATORS);
  if (decorator === undefined) return null;
  const targetEntity = relationTargetName(decorator.call);
  if (targetEntity === null) return null;
  const joinColumns = readJoinColumns(member);
  const hasJoinTable = findDecoratorCall(member, ["JoinTable"]) !== undefined;

  return {
    propertyName,
    type: relationTypeOf(decorator.name),
    targetEntity,
    targetTable: null,
    inverseSide: relationInverseSide(decorator.call),
    joinColumns,
    owning:
      decorator.name === "ManyToOne" ||
      joinColumns.length > 0 ||
      (decorator.name === "ManyToMany" && hasJoinTable),
    description,
  };
};

const readJoinColumns = (member: ts.PropertyDeclaration): string[] => {
  const decorator = findDecoratorCall(member, ["JoinColumn"]);
  if (decorator === undefined) return [];
  const object = firstObjectArgument(decorator.call);
  const name = readObjectStringProperty(object, "name");
  return name === undefined ? [] : [name];
};

const relationTypeOf = (decoratorName: string): SchemaRelationType => {
  switch (decoratorName) {
    case "OneToOne":
      return "one-to-one";
    case "OneToMany":
      return "one-to-many";
    case "ManyToMany":
      return "many-to-many";
    default:
      return "many-to-one";
  }
};

const inferredColumnType = (decoratorName: string, tsType: string): string => {
  if (["CreateDateColumn", "UpdateDateColumn", "DeleteDateColumn"].includes(decoratorName)) {
    return "timestamp";
  }
  const normalized = tsType.replace(/\s/g, "");
  if (normalized.includes("string")) return "varchar";
  if (normalized.includes("number")) return "int";
  if (normalized.includes("boolean")) return "boolean";
  if (normalized.includes("Date")) return "timestamp";
  return "unknown";
};
