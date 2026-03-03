/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    /* ── BEM naming: .sto-block__element--modifier ──────────────────── */
    "selector-class-pattern": [
      "^sto(-[a-z]+)+(__[a-z]+(-[a-z]+)*)?(--[a-z]+(-[a-z]+)*)?$",
      {
        message: "Class selector must follow BEM: .sto-block__element--modifier ({{ selector }})",
      },
    ],
    "keyframes-name-pattern": [
      "^sto(-[a-z]+)+$",
      {
        message: "Keyframe name must start with 'sto-' and use kebab-case ({{ name }})",
      },
    ],

    /* ── Strictness ─────────────────────────────────────────────────── */
    "declaration-no-important": true,
    "no-descending-specificity": true,
    "selector-max-id": 0,
    "selector-max-specificity": "0,4,0",
    "max-nesting-depth": 2,
    "shorthand-property-no-redundant-values": true,
    "declaration-block-no-redundant-longhand-properties": true,
  },
};
