// SPEC.md D-05: Decimal128 everywhere, `number`/`float` forbidden for money and
// quantities at every layer. This flags `: number` type annotations on any
// property, class field, variable or parameter whose name looks money-shaped —
// use Money/Qty (src/common/money) instead.
const MONEY_NAME =
  /(^|_)(amount|price|qty|quantity|balance|cost|fee|rate|proceeds|pnl|principal|value|total)($|_)/i;

/** @param {string | undefined} name */
function looksLikeMoney(name) {
  return typeof name === 'string' && MONEY_NAME.test(name);
}

/** @param {any} node */
function isNumberKeyword(node) {
  return !!node && node.type === 'TSTypeAnnotation' && node.typeAnnotation?.type === 'TSNumberKeyword';
}

module.exports = {
  rules: {
    'no-number-money': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow `number` for money/quantity fields — use Money/Qty (Decimal128) instead.',
        },
        schema: [],
        messages: {
          useMoneyOrQty:
            "'{{name}}' looks like a money/quantity field typed as number — use Money or Qty instead (SPEC.md D-05: Decimal128 everywhere, float is forbidden).",
        },
      },
      create(context) {
        /** @param {any} annotation @param {string | undefined} name */
        function check(annotation, name) {
          if (isNumberKeyword(annotation) && looksLikeMoney(name)) {
            context.report({ node: annotation.typeAnnotation, messageId: 'useMoneyOrQty', data: { name } });
          }
        }

        return {
          TSPropertySignature(node) {
            check(node.typeAnnotation, node.key?.name);
          },
          PropertyDefinition(node) {
            check(node.typeAnnotation, node.key?.name);
          },
          Identifier(node) {
            check(node.typeAnnotation, node.name);
          },
        };
      },
    },
  },
};
