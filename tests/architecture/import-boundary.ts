import { dirname, resolve, sep } from "node:path";
import ts from "typescript";

/** Parse syntax rather than grepping: covers imports, re-exports, require, and dynamic import. */
export function forbiddenImports(
  file: string,
  source: string,
  root: string,
): string[] {
  const layer = file.startsWith(resolve(root, "src/domain") + sep)
    ? "domain"
    : "application";
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const violations: string[] = [];
  const inspect = (specifier: string) => {
    const destination = specifier.startsWith("@/")
      ? resolve(root, "src", specifier.slice(2))
      : specifier.startsWith(".")
        ? resolve(dirname(file), specifier)
        : null;
    const allowed =
      destination &&
      ["domain", ...(layer === "application" ? ["application"] : [])].some(
        (name) =>
          destination === resolve(root, "src", name) ||
          destination.startsWith(resolve(root, "src", name) + sep),
      );
    if (!allowed) violations.push(specifier);
  };
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      inspect(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) inspect(argument.text);
      else violations.push("<computed module>");
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return violations;
}
