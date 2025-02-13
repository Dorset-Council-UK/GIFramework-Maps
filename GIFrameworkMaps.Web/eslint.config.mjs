import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  { ignores: ['**/*.js'] },
  {
    rules: {
      "no-var": "error",
      "no-console": [
        "error",
        { "allow": ["warn", "error"] }
      ],
      "prefer-template": "warn",
      "prefer-arrow-callback": "warn",
      //// Note: you must disable the base rule as it can report incorrect errors
      //"no-magic-numbers": "off",
      //"@typescript-eslint/no-magic-numbers":  [
      //  "warn",
      //  {
      //    "ignore": [ 1, -1, 0 ],
      //    "ignoreArrayIndexes":  true
      //  }
      //] //<- This is a fun one, and should be encouraged, but currently causes over 400 warnings!
    },
  },
];