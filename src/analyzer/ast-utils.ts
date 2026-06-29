import ts from "typescript";

export interface DecoratorCall {
  name: string;
  call: ts.CallExpression;
}

export const getDecoratorCalls = (node: ts.Node): DecoratorCall[] => {
  const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
  if (decorators === undefined) return [];

  return decorators.flatMap((decorator) => {
    if (!ts.isCallExpression(decorator.expression)) return [];
    const name = getExpressionName(decorator.expression.expression);
    return name === null ? [] : [{ name, call: decorator.expression }];
  });
};

export const findDecoratorCall = (
  node: ts.Node,
  names: readonly string[],
): DecoratorCall | undefined =>
  getDecoratorCalls(node).find((decorator) => names.includes(decorator.name));

export const readStringExpression = (expression: ts.Expression): string | undefined => {
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  return undefined;
};

export const readObjectStringProperty = (
  object: ts.ObjectLiteralExpression | undefined,
  name: string,
): string | undefined => {
  const initializer = readObjectProperty(object, name);
  return initializer === undefined ? undefined : readStringExpression(initializer);
};

export const readObjectBooleanProperty = (
  object: ts.ObjectLiteralExpression | undefined,
  name: string,
): boolean | undefined => {
  const initializer = readObjectProperty(object, name);
  if (initializer === undefined) return undefined;
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
};

export const readObjectProperty = (
  object: ts.ObjectLiteralExpression | undefined,
  name: string,
): ts.Expression | undefined => {
  if (object === undefined) return undefined;
  const property = object.properties.find(
    (item): item is ts.PropertyAssignment =>
      ts.isPropertyAssignment(item) && propertyNameText(item.name) === name,
  );
  return property?.initializer;
};

export const firstObjectArgument = (
  call: ts.CallExpression,
): ts.ObjectLiteralExpression | undefined =>
  call.arguments.find((arg): arg is ts.ObjectLiteralExpression => ts.isObjectLiteralExpression(arg));

export const relationTargetName = (call: ts.CallExpression): string | null => {
  const [first] = call.arguments;
  if (first === undefined) return null;
  if (ts.isArrowFunction(first)) return relationTargetFromArrow(first);
  return null;
};

export const relationInverseSide = (call: ts.CallExpression): string | null => {
  const second = call.arguments[1];
  if (second === undefined || !ts.isArrowFunction(second)) return null;
  if (ts.isPropertyAccessExpression(second.body)) return second.body.name.text;
  return null;
};

export const propertyNameOf = (node: ts.PropertyDeclaration): string | null => {
  if (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)) return node.name.text;
  return null;
};

export const typeTextOf = (node: ts.PropertyDeclaration): string => node.type?.getText() ?? "";

const relationTargetFromArrow = (arrow: ts.ArrowFunction): string | null => {
  const body = arrow.body;
  if (ts.isIdentifier(body)) return body.text;
  if (ts.isPropertyAccessExpression(body)) return body.name.text;
  return null;
};

const getExpressionName = (expression: ts.Expression): string | null => {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
};

const propertyNameText = (name: ts.PropertyName): string | null => {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
};
