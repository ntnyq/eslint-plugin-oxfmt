import { expect } from 'vitest'
import { oxfmt as rule } from '../../src/rules/oxfmt'
import { $, run } from '../internal'

run({
  name: 'oxfmt',
  rule,
  /**
   * @pg invalid cases
   */
  invalid: [
    {
      description: `Should add semicolon at the end of statements when semi is true (default behavior)`,
      filename: 'test.js',
      name: 'add semicolon',
      code: $`
        console.log("hello world")
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`"console.log("hello world");"`)
      },
    },
    {
      description: `Should remove semicolon at the end of statements when semi is false`,
      filename: 'test.js',
      name: 'remove semicolon',
      code: $`
        const name = "foobar";
      `,
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`"const name = \"foobar\""`)
      },
    },
    {
      description: `Should convert double quotes to single quotes when singleQuote is true`,
      filename: 'test.js',
      name: 'convert to single quotes',
      code: $`
        console.log("hello world");
      `,
      options: [
        {
          insertFinalNewline: false,
          singleQuote: true,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`"console.log('hello world');"`)
      },
    },
    {
      description: `Should wrap long lines based on printWidth setting (40 characters)`,
      filename: 'test.js',
      name: 'wrap long lines',
      code: $`
        foo(reallyLongArg(), omgSoManyParameters());
      `,
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "foo(
            reallyLongArg(),
            omgSoManyParameters(),
          );"
        `)
      },
    },
    {
      description: `Should remove parentheses around single arrow function parameter when arrowParens is avoid`,
      filename: 'test.js',
      name: 'remove arrow parens',
      code: $`
        const isOdd = (n) => n % 2 === 1;
      `,
      options: [
        {
          arrowParens: 'avoid',
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const isOdd = n => n % 2 === 1;"`,
        )
      },
    },
    {
      description: `Should remove trailing commas from object literals when trailingComma is none`,
      filename: 'test.js',
      name: 'remove trailing comma',
      code: $`
        const arr = {
          name: "foobar",
          age: 123,
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'none',
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "const arr = {
            name: \"foobar\",
            age: 123
          };"
        `)
      },
    },
    {
      description: `Should remove unnecessary quotes from object property names when quoteProps is as-needed`,
      filename: 'test.js',
      name: 'remove unnecessary quotes',
      code: $`
        const foobar = {
          "name": "foobar"
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          quoteProps: 'as-needed',
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "const foobar = {
            name: \"foobar\",
          };"
        `)
      },
    },
    {
      description: `Should adjust indentation to 4 spaces per level when tabWidth is 4`,
      filename: 'test.js',
      name: 'adjust indentation',
      code: $`
        function test() {
          return true;
        }
      `,
      options: [
        {
          insertFinalNewline: false,
          tabWidth: 4,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "function test() {
              return true;
          }"
        `)
      },
    },
    {
      description: `Should use tab characters for indentation instead of spaces when useTabs is true`,
      filename: 'test.js',
      name: 'use tabs',
      code: $`
        function test() {
          return true;
        }
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          useTabs: true,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "function test() {
          	return true;
          }"
        `)
      },
    },
    {
      description: `Should remove spaces inside object literal braces when bracketSpacing is false`,
      filename: 'test.js',
      name: 'remove bracket spacing',
      code: $`
        const obj = { name: "foobar" };
      `,
      options: [
        {
          bracketSpacing: false,
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const obj = {name: \"foobar\"};"`,
        )
      },
    },
    {
      description: `Should use CRLF (\\r\\n) line endings instead of LF when endOfLine is crlf`,
      filename: 'test.js',
      name: 'use CRLF line endings',
      code: $`
        const a = 1;
        const b = 2;
      `,
      options: [
        {
          endOfLine: 'crlf',
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatch(/const a = 1;\r\nconst b = 2;/)
      },
    },
    {
      description: `Should use single quotes in JSX attributes when jsxSingleQuote is true`,
      filename: 'test.jsx',
      name: 'JSX single quotes',
      code: $`
        const element = <div className="container">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          jsxSingleQuote: true,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const element = <div className='container'>Hello</div>;"`,
        )
      },
    },
    {
      description: `Should format JSX tags compactly on one line when possible with bracketSameLine enabled`,
      filename: 'test.jsx',
      name: 'JSX bracket same line',
      code: $`
        const element = <div
          className="container"
        >
          Hello
        </div>;
      `,
      options: [
        {
          bracketSameLine: true,
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const element = <div className=\"container\">Hello</div>;"`,
        )
      },
    },
    {
      description: `Should put each JSX attribute on a separate line when singleAttributePerLine is true`,
      filename: 'test.jsx',
      name: 'JSX single attribute per line',
      code: $`
        const element = <div className="container" id="main">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
          singleAttributePerLine: true,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "const element = (
            <div
              className="container"
              id="main"
            >
              Hello
            </div>
          );"
        `)
      },
    },
    {
      description: `Should sort Tailwind CSS classes when experimentalTailwindcss is enabled`,
      filename: 'test.jsx',
      name: 'Tailwind class sorting',
      code: $`
        const element = <div className="text-lg bg-red-500 flex px-2">Hello</div>;
      `,
      options: [
        {
          experimentalTailwindcss: {},
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const element = <div className="flex bg-red-500 px-2 text-lg">Hello</div>;"`,
        )
      },
    },
    {
      description: `Should sort Tailwind classes for custom attributes when attributes option is provided`,
      filename: 'test.jsx',
      name: 'Tailwind custom attribute option',
      code: $`
        const element = <div tw="text-lg bg-red-500 flex px-2">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          experimentalTailwindcss: {
            attributes: ['tw'],
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const element = <div tw="flex bg-red-500 px-2 text-lg">Hello</div>;"`,
        )
      },
    },
    {
      description: `Should sort Tailwind classes inside custom functions when functions option is provided`,
      filename: 'test.js',
      name: 'Tailwind custom function option',
      code: $`
        const cls = cn("text-lg bg-red-500 flex px-2")
      `,
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          useConfig: false,
          experimentalTailwindcss: {
            functions: ['cn'],
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const cls = cn("flex bg-red-500 px-2 text-lg")"`,
        )
      },
    },
    {
      description: `Should retain duplicate classes when preserveDuplicates is true`,
      filename: 'test.jsx',
      name: 'Tailwind preserve duplicates option',
      code: $`
        const element = <div className="text-lg px-2 px-2 bg-red-500 flex">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          experimentalTailwindcss: {
            preserveDuplicates: true,
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const element = <div className="flex bg-red-500 px-2 px-2 text-lg">Hello</div>;"`,
        )
      },
    },
    {
      description: `Should format while respecting whitespace when preserveWhitespace is true`,
      filename: 'test.jsx',
      name: 'Tailwind preserve whitespace option',
      code: $`
        const element = <div className="text-lg   bg-red-500  flex px-2">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          experimentalTailwindcss: {
            preserveWhitespace: true,
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(
          `"const element = <div className="flex   bg-red-500  px-2 text-lg">Hello</div>;"`,
        )
      },
    },
    {
      description: `Should reorder imports alphabetically when experimentalSortImports is enabled`,
      filename: 'imports.js',
      name: 'sort imports when enabled',
      code: $`
        import z from "z";
        import a from "a";
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          experimentalSortImports: {
            newlinesBetween: false,
            order: 'asc',
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "import a from \"a\";\nimport z from \"z\";"
        `)
      },
    },
    {
      description: `Should sort package.json scripts when experimentalSortPackageJson is enabled`,
      filename: 'package.json',
      name: 'sort package json scripts',
      code: $`
        {
          "scripts": {
            "build": "echo build",
            "lint": "echo lint",
            "dev": "echo dev"
          }
        }
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          experimentalSortPackageJson: {
            sortScripts: true,
          },
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "{\n  \"scripts\": {\n    \"build\": \"echo build\",\n    \"dev\": \"echo dev\",\n    \"lint\": \"echo lint\"\n  }\n}"
        `)
      },
    },
    {
      description: `Should remove trailing comma when override for **/*.test.js sets trailingComma to none`,
      filename: 'src/foo.test.js',
      name: 'overrides apply per glob',
      code: $`
        const obj = {
          foo: 1,
          bar: 2,
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'all',
          useConfig: false,
          overrides: [
            {
              files: ['**/*.test.js'],
              options: {
                trailingComma: 'none',
              },
            },
          ],
        },
      ],
      errors(errors) {
        expect(errors).toMatchSnapshot()
      },
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "const obj = {
            foo: 1,
            bar: 2
          };"
        `)
      },
    },
  ],
  /**
   * @pg valid cases
   */
  valid: [
    {
      description: `Code with semicolons should be accepted when semi is true (default)`,
      filename: 'test.js',
      name: 'with semicolons',
      code: $`
        console.log("hello world");
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code without semicolons should be accepted when semi is false`,
      filename: 'test.js',
      name: 'without semicolons',
      code: $`
        const name = "foobar"
      `,
      options: [
        {
          insertFinalNewline: false,
          semi: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with single quotes should be accepted when singleQuote is true`,
      filename: 'test.js',
      name: 'with single quotes',
      code: $`
        console.log('hello world');
      `,
      options: [
        {
          insertFinalNewline: false,
          singleQuote: true,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with double quotes should be accepted when singleQuote is false (default)`,
      filename: 'test.js',
      name: 'with double quotes',
      code: $`
        console.log("hello world");
      `,
      options: [
        {
          insertFinalNewline: false,
          singleQuote: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with properly wrapped lines should be accepted based on printWidth setting`,
      filename: 'test.js',
      name: 'properly wrapped lines',
      code: $`
        foo(
          reallyLongArg(),
          omgSoManyParameters(),
        );
      `,
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
          useConfig: false,
        },
      ],
    },
    {
      description: `Arrow functions with parentheses should be accepted when arrowParens is always (default)`,
      filename: 'test.js',
      name: 'with arrow parens',
      code: $`
        const isOdd = (n) => n % 2 === 1;
      `,
      options: [
        {
          arrowParens: 'always',
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Arrow functions without parentheses should be accepted when arrowParens is avoid`,
      filename: 'test.js',
      name: 'without arrow parens',
      code: $`
        const isOdd = n => n % 2 === 1;
      `,
      options: [
        {
          arrowParens: 'avoid',
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with trailing commas should be accepted when trailingComma is all (default)`,
      filename: 'test.js',
      name: 'with trailing commas',
      code: $`
        const arr = {
          name: "foobar",
          age: 123,
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'all',
          useConfig: false,
        },
      ],
    },
    {
      description: `Code without trailing commas should be accepted when trailingComma is none`,
      filename: 'test.js',
      name: 'without trailing commas',
      code: $`
        const arr = {
          name: "foobar",
          age: 123
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'none',
          useConfig: false,
        },
      ],
    },
    {
      description: `Object properties without quotes should be accepted when quoteProps is as-needed (default)`,
      filename: 'test.js',
      name: 'unquoted props',
      code: $`
        const foobar = {
          name: "foobar",
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          quoteProps: 'as-needed',
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with 2-space indentation should be accepted when tabWidth is 2 (default)`,
      filename: 'test.js',
      name: '2-space indentation',
      code: $`
        function test() {
          return true;
        }
      `,
      options: [
        {
          insertFinalNewline: false,
          tabWidth: 2,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with 4-space indentation should be accepted when tabWidth is 4`,
      filename: 'test.js',
      name: '4-space indentation',
      code: $`
        function test() {
            return true;
        }
      `,
      options: [
        {
          insertFinalNewline: false,
          tabWidth: 4,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with tab characters for indentation should be accepted when useTabs is true`,
      filename: 'test.js',
      name: 'with tabs',
      code: `function test() {
	return true;
}`,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          useTabs: true,
        },
      ],
    },
    {
      description: `Objects with spaces inside braces should be accepted when bracketSpacing is true (default)`,
      filename: 'test.js',
      name: 'with bracket spacing',
      code: $`
        const obj = { name: "foobar" };
      `,
      options: [
        {
          bracketSpacing: true,
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Objects without spaces inside braces should be accepted when bracketSpacing is false`,
      filename: 'test.js',
      name: 'without bracket spacing',
      code: $`
        const obj = {name: "foobar"};
      `,
      options: [
        {
          bracketSpacing: false,
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Code with LF line endings should be accepted when endOfLine is lf (default)`,
      filename: 'test.js',
      name: 'with LF endings',
      code: $`
        const a = 1;
        const b = 2;
      `,
      options: [
        {
          endOfLine: 'lf',
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `JSX attributes with double quotes should be accepted when jsxSingleQuote is false (default)`,
      filename: 'test.jsx',
      name: 'JSX with double quotes',
      code: $`
        const element = <div className="container">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          jsxSingleQuote: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `JSX attributes with single quotes should be accepted when jsxSingleQuote is true`,
      filename: 'test.jsx',
      name: 'JSX with single quotes',
      code: $`
        const element = <div className='container'>Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          jsxSingleQuote: true,
          useConfig: false,
        },
      ],
    },
    {
      description: `Compact JSX elements should be accepted when bracketSameLine is true`,
      filename: 'test.jsx',
      name: 'JSX compact format',
      code: $`
        const element = <div className="container">Hello</div>;
      `,
      options: [
        {
          bracketSameLine: true,
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `JSX with each attribute on separate lines should be accepted when singleAttributePerLine is true`,
      filename: 'test.jsx',
      name: 'JSX multi-line attributes',
      code: $`
        const element = (
          <div
            className="container"
            id="main"
          >
            Hello
          </div>
        );
      `,
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
          singleAttributePerLine: true,
          useConfig: false,
        },
      ],
    },
    {
      description: `Should remain valid when experimentalTailwindcss uses a custom config path`,
      filename: 'test.jsx',
      name: 'Tailwind config option (valid)',
      code: $`
        const element = <div className="flex bg-red-500 px-2 text-lg">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          experimentalTailwindcss: {
            config: './tests/fixtures/tailwind.config.js',
          },
        },
      ],
    },
    {
      description: `Should remain valid when experimentalTailwindcss uses a custom stylesheet path`,
      filename: 'test.jsx',
      name: 'Tailwind stylesheet option (valid)',
      code: $`
        const element = <div className="text-lg bg-red-500 flex px-2">Hello</div>;
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          experimentalTailwindcss: {
            stylesheet: './src/app.css',
          },
        },
      ],
    },
    {
      description: `Should accept markdown when prose/html formatting controls are provided`,
      filename: 'notes.md',
      name: 'prose and embedded formatting options',
      code: $`
        # Title
        
        Short paragraph that fits.
      `,
      options: [
        {
          embeddedLanguageFormatting: 'off',
          htmlWhitespaceSensitivity: 'ignore',
          insertFinalNewline: false,
          proseWrap: 'preserve',
          useConfig: false,
        },
      ],
    },
    {
      description: `Should accept Vue files when vueIndentScriptAndStyle is true`,
      filename: 'component.vue',
      name: 'vue indent script and style',
      code: $`
        <template>
          <div>
            <span>Hello</span>
          </div>
        </template>
        <script>
          export default {
            name: "App",
          };
        </script>
        <style>
          .root {
            color: red;
          }
        </style>
      `,
      options: [
        {
          insertFinalNewline: false,
          useConfig: false,
          vueIndentScriptAndStyle: true,
        },
      ],
    },
    {
      description: `Should accept multi-line object when objectWrap is set to preserve`,
      filename: 'object.js',
      name: 'object wrap preserve',
      code: $`
        const obj = {
          foo: 1,
          bar: 2,
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          objectWrap: 'preserve',
          useConfig: false,
        },
      ],
    },
    {
      description: `Should accept when file matches ignorePatterns and code is already formatted`,
      filename: 'ignored/file.js',
      name: 'ignored file pattern configured',
      code: $`
        export const value = 1;
      `,
      options: [
        {
          ignorePatterns: ['**/ignored/**'],
          insertFinalNewline: false,
          useConfig: false,
        },
      ],
    },
    {
      description: `Should fall back to base options when file is excluded from override`,
      filename: 'tests/skip.ts',
      name: 'overrides exclude files',
      code: $`
        const obj = {
          foo: 1,
          bar: 2
        };
      `,
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'none',
          useConfig: false,
          overrides: [
            {
              excludeFiles: ['**/skip.ts'],
              files: ['**/*.ts'],
              options: {
                trailingComma: 'all',
              },
            },
          ],
        },
      ],
    },
  ],
})
