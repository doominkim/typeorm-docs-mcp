export interface AnalyzeTypeormSchemaInput {
  entities: string | string[];
  projectRoot?: string;
}

export interface SchemaGraph {
  projectRoot: string;
  patterns: string[];
  tables: SchemaTable[];
}

export interface SchemaTable {
  name: string;
  entityName: string;
  file: string;
  description: string;
  tags: SchemaTags;
  columns: SchemaColumn[];
  relations: SchemaRelation[];
}

export interface SchemaTags {
  namespace: string[];
  erd: string[];
  describe: string[];
  hidden: boolean;
}

export interface SchemaColumn {
  propertyName: string;
  name: string;
  type: string;
  primaryKey: boolean;
  generated: boolean;
  unique: boolean;
  nullable: boolean;
  foreignKey: boolean;
  foreignKeyTargetTable: string | null;
  description: string;
}

export type SchemaRelationType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

export interface SchemaRelation {
  propertyName: string;
  type: SchemaRelationType;
  targetEntity: string;
  targetTable: string | null;
  inverseSide: string | null;
  joinColumns: string[];
  owning: boolean;
  description: string;
}
