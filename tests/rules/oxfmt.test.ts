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
      filename: 'test.js',
      name: 'add semicolon',
      code: $`
        console.log("hello world")
      `,
      description:
        'Should add semicolon at the end of statements when semi is true (default behavior)',
      options: [
        {
          insertFinalNewline: false,
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
      filename: 'test.js',
      name: 'remove semicolon',
      code: $`
        const name = "foobar";
      `,
      description:
        'Should remove semicolon at the end of statements when semi is false',
      options: [
        {
          insertFinalNewline: false,
          semi: false,
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
      filename: 'test.js',
      name: 'convert to single quotes',
      code: $`
        console.log("hello world");
      `,
      description:
        'Should convert double quotes to single quotes when singleQuote is true',
      options: [
        {
          insertFinalNewline: false,
          singleQuote: true,
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
      filename: 'test.js',
      name: 'wrap long lines',
      code: $`
        foo(reallyLongArg(), omgSoManyParameters());
      `,
      description:
        'Should wrap long lines based on printWidth setting (40 characters)',
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
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
      filename: 'test.js',
      name: 'remove arrow parens',
      code: $`
        const isOdd = (n) => n % 2 === 1;
      `,
      description:
        'Should remove parentheses around single arrow function parameter when arrowParens is avoid',
      options: [
        {
          arrowParens: 'avoid',
          insertFinalNewline: false,
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
      filename: 'test.js',
      name: 'remove trailing comma',
      code: $`
        const arr = {
          name: "foobar",
          age: 123,
        };
      `,
      description:
        'Should remove trailing commas from object literals when trailingComma is none',
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'none',
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
      filename: 'test.js',
      name: 'remove unnecessary quotes',
      code: $`
        const foobar = {
          "name": "foobar"
        };
      `,
      description:
        'Should remove unnecessary quotes from object property names when quoteProps is as-needed',
      options: [
        {
          insertFinalNewline: false,
          quoteProps: 'as-needed',
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
      filename: 'test.js',
      name: 'adjust indentation',
      code: $`
        function test() {
          return true;
        }
      `,
      description:
        'Should adjust indentation to 4 spaces per level when tabWidth is 4',
      options: [
        {
          insertFinalNewline: false,
          tabWidth: 4,
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
      filename: 'test.js',
      name: 'use tabs',
      code: $`
        function test() {
          return true;
        }
      `,
      description:
        'Should use tab characters for indentation instead of spaces when useTabs is true',
      options: [
        {
          insertFinalNewline: false,
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
      filename: 'test.js',
      name: 'remove bracket spacing',
      code: $`
        const obj = { name: "foobar" };
      `,
      description:
        'Should remove spaces inside object literal braces when bracketSpacing is false',
      options: [
        {
          bracketSpacing: false,
          insertFinalNewline: false,
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
      filename: 'test.js',
      name: 'use CRLF line endings',
      code: $`
        const a = 1;
        const b = 2;
      `,
      description:
        'Should use CRLF (\\r\\n) line endings instead of LF when endOfLine is crlf',
      options: [
        {
          endOfLine: 'crlf',
          insertFinalNewline: false,
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
      filename: 'test.jsx',
      name: 'JSX single quotes',
      code: $`
        const element = <div className="container">Hello</div>;
      `,
      description:
        'Should use single quotes in JSX attributes when jsxSingleQuote is true',
      options: [
        {
          insertFinalNewline: false,
          jsxSingleQuote: true,
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
      filename: 'test.jsx',
      name: 'JSX bracket same line',
      code: $`
        const element = <div
          className="container"
        >
          Hello
        </div>;
      `,
      description:
        'Should format JSX tags compactly on one line when possible with bracketSameLine enabled',
      options: [
        {
          bracketSameLine: true,
          insertFinalNewline: false,
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
      filename: 'test.jsx',
      name: 'JSX single attribute per line',
      code: $`
        const element = <div className="container" id="main">Hello</div>;
      `,
      description:
        'Should put each JSX attribute on a separate line when singleAttributePerLine is true',
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
          singleAttributePerLine: true,
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
  ],
  /**
   * @pg valid cases
   */
  valid: [
    {
      filename: 'test.js',
      name: 'with semicolons',
      code: $`
        console.log("hello world");
      `,
      description:
        'Code with semicolons should be accepted when semi is true (default)',
      options: [
        {
          insertFinalNewline: false,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'without semicolons',
      code: $`
        const name = "foobar"
      `,
      description:
        'Code without semicolons should be accepted when semi is false',
      options: [
        {
          insertFinalNewline: false,
          semi: false,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'with single quotes',
      code: $`
        console.log('hello world');
      `,
      description:
        'Code with single quotes should be accepted when singleQuote is true',
      options: [
        {
          insertFinalNewline: false,
          singleQuote: true,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'with double quotes',
      code: $`
        console.log("hello world");
      `,
      description:
        'Code with double quotes should be accepted when singleQuote is false (default)',
      options: [
        {
          insertFinalNewline: false,
          singleQuote: false,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'properly wrapped lines',
      code: $`
        foo(
          reallyLongArg(),
          omgSoManyParameters(),
        );
      `,
      description:
        'Code with properly wrapped lines should be accepted based on printWidth setting',
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'with arrow parens',
      code: $`
        const isOdd = (n) => n % 2 === 1;
      `,
      description:
        'Arrow functions with parentheses should be accepted when arrowParens is always (default)',
      options: [
        {
          arrowParens: 'always',
          insertFinalNewline: false,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'without arrow parens',
      code: $`
        const isOdd = n => n % 2 === 1;
      `,
      description:
        'Arrow functions without parentheses should be accepted when arrowParens is avoid',
      options: [
        {
          arrowParens: 'avoid',
          insertFinalNewline: false,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'with trailing commas',
      code: $`
        const arr = {
          name: "foobar",
          age: 123,
        };
      `,
      description:
        'Code with trailing commas should be accepted when trailingComma is all (default)',
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'all',
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'without trailing commas',
      code: $`
        const arr = {
          name: "foobar",
          age: 123
        };
      `,
      description:
        'Code without trailing commas should be accepted when trailingComma is none',
      options: [
        {
          insertFinalNewline: false,
          trailingComma: 'none',
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'unquoted props',
      code: $`
        const foobar = {
          name: "foobar",
        };
      `,
      description:
        'Object properties without quotes should be accepted when quoteProps is as-needed (default)',
      options: [
        {
          insertFinalNewline: false,
          quoteProps: 'as-needed',
        },
      ],
    },
    {
      filename: 'test.js',
      name: '2-space indentation',
      code: $`
        function test() {
          return true;
        }
      `,
      description:
        'Code with 2-space indentation should be accepted when tabWidth is 2 (default)',
      options: [
        {
          insertFinalNewline: false,
          tabWidth: 2,
        },
      ],
    },
    {
      filename: 'test.js',
      name: '4-space indentation',
      code: $`
        function test() {
            return true;
        }
      `,
      description:
        'Code with 4-space indentation should be accepted when tabWidth is 4',
      options: [
        {
          insertFinalNewline: false,
          tabWidth: 4,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'with tabs',
      code: `function test() {
	return true;
}`,
      description:
        'Code with tab characters for indentation should be accepted when useTabs is true',
      options: [
        {
          insertFinalNewline: false,
          useTabs: true,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'with bracket spacing',
      code: $`
        const obj = { name: "foobar" };
      `,
      description:
        'Objects with spaces inside braces should be accepted when bracketSpacing is true (default)',
      options: [
        {
          bracketSpacing: true,
          insertFinalNewline: false,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'without bracket spacing',
      code: $`
        const obj = {name: "foobar"};
      `,
      description:
        'Objects without spaces inside braces should be accepted when bracketSpacing is false',
      options: [
        {
          bracketSpacing: false,
          insertFinalNewline: false,
        },
      ],
    },
    {
      filename: 'test.js',
      name: 'with LF endings',
      code: $`
        const a = 1;
        const b = 2;
      `,
      description:
        'Code with LF line endings should be accepted when endOfLine is lf (default)',
      options: [
        {
          endOfLine: 'lf',
          insertFinalNewline: false,
        },
      ],
    },
    {
      filename: 'test.jsx',
      name: 'JSX with double quotes',
      code: $`
        const element = <div className="container">Hello</div>;
      `,
      description:
        'JSX attributes with double quotes should be accepted when jsxSingleQuote is false (default)',
      options: [
        {
          insertFinalNewline: false,
          jsxSingleQuote: false,
        },
      ],
    },
    {
      filename: 'test.jsx',
      name: 'JSX with single quotes',
      code: $`
        const element = <div className='container'>Hello</div>;
      `,
      description:
        'JSX attributes with single quotes should be accepted when jsxSingleQuote is true',
      options: [
        {
          insertFinalNewline: false,
          jsxSingleQuote: true,
        },
      ],
    },
    {
      filename: 'test.jsx',
      name: 'JSX compact format',
      code: $`
        const element = <div className="container">Hello</div>;
      `,
      description:
        'Compact JSX elements should be accepted when bracketSameLine is true',
      options: [
        {
          bracketSameLine: true,
          insertFinalNewline: false,
        },
      ],
    },
    {
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
      description:
        'JSX with each attribute on separate lines should be accepted when singleAttributePerLine is true',
      options: [
        {
          insertFinalNewline: false,
          printWidth: 40,
          singleAttributePerLine: true,
        },
      ],
    },
  ],
})
