export const toSnakeCase = (value: string): string =>
  value
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();

export const uniqueValues = (values: string[]): string[] => [
  ...new Set(values.filter((value) => value.length > 0)),
];
