import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { expect, it } from 'vitest'
import { lintText } from './helpers/lint'
import { OXFMT_CLI } from './helpers/paths'
import { withTempProject } from './helpers/project'

const SOURCE = 'export const value="hello"\n'
const SINGLE_QUOTED = "export const value = 'hello';\n"

it.each(['.oxfmtrc.json', '.oxfmtrc.jsonc'])(
  'matches the CLI for BOM-prefixed %s',
  async filename => {
    await withTempProject(async cwd => {
      const filepath = join(cwd, 'a.js')

      await writeFile(filepath, SOURCE)
      await writeFile(join(cwd, filename), '\u{FEFF}{"singleQuote": true}')

      const output = await lintText(cwd, filepath, SOURCE)
      const cli = spawnSync(process.execPath, [OXFMT_CLI, '--write', 'a.js'], {
        cwd,
        encoding: 'utf8',
      })

      expect(cli.status).toBe(0)
      expect(await readFile(filepath, 'utf8')).toBe(SINGLE_QUOTED)
      expect(output).toBe(SINGLE_QUOTED)
    })
  },
)
