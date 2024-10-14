/** @typedef {import('prettier').Config} PrettierConfig */

/** @type PrettierConfig */
const config ={
  plugins: ['prettier-plugin-tailwindcss'],
  quoteProps: 'as-needed',
  arrowParens: 'always',
  endOfLine: 'auto',
  trailingComma: 'es5',
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  jsxSingleQuote: false,
  bracketSpacing: true,
  bracketSameLine: false,
}

export default config