import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isOxfmtIgnored } from '../src'
import { fixturePath, withTempDir } from './helpers'

describe('isOxfmtIgnored', () => {
  it('ignores default node_modules directory and can opt in with option withNodeModules', async () => {
    await withTempDir('oxfmt-ignore-default-', async cwd => {
      const filepath = join(cwd, 'node_modules', 'pkg', 'index.js')
      await mkdir(join(cwd, 'node_modules', 'pkg'), { recursive: true })
      await writeFile(filepath, 'export {}\n', 'utf8')

      const ignoredByDefault = await isOxfmtIgnored({ cwd, filepath })
      const included = await isOxfmtIgnored({
        cwd,
        filepath,
        withNodeModules: true,
      })

      expect(ignoredByDefault).toStrictEqual({
        ignored: true,
        reason: 'default-dir',
      })
      expect(included).toStrictEqual({ ignored: false })
    })
  })

  it.each(['.hg', '.sl'])(
    'always ignores default VCS directory %s',
    async ignoredDir => {
      await withTempDir('oxfmt-ignore-default-vcs-', async cwd => {
        const filepath = join(cwd, ignoredDir, 'store', 'index.js')
        await mkdir(join(cwd, ignoredDir, 'store'), { recursive: true })
        await writeFile(filepath, 'export {}\n', 'utf8')

        const result = await isOxfmtIgnored({
          cwd,
          filepath,
          withNodeModules: true,
        })

        expect(result).toStrictEqual({
          ignored: true,
          reason: 'default-dir',
        })
      })
    },
  )

  it('does not treat a filename that matches an ignored directory name as ignored', async () => {
    await withTempDir('oxfmt-ignore-filename-collision-', async cwd => {
      const filepath = join(cwd, 'src', 'node_modules')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('ignores known lockfiles by default', async () => {
    await withTempDir('oxfmt-ignore-lock-', async cwd => {
      const filepath = join(cwd, 'pnpm-lock.yaml')
      await writeFile(filepath, 'lockfileVersion: 9\n', 'utf8')

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({ ignored: true, reason: 'lockfile' })
    })
  })

  it.each([
    'MODULE.bazel.lock',
    'deno.lock',
    'composer.lock',
    'Package.resolved',
    'Pipfile.lock',
    'flake.lock',
    'Cargo.lock',
    'Gopkg.lock',
    'pdm.lock',
    'poetry.lock',
    'uv.lock',
  ])('ignores upstream oxfmt lockfile %s by default', async lockfile => {
    await withTempDir('oxfmt-ignore-upstream-lock-', async cwd => {
      const filepath = join(cwd, lockfile)
      await writeFile(filepath, 'lockfile\n', 'utf8')

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({ ignored: true, reason: 'lockfile' })
    })
  })

  it('uses nearest-parent .gitignore chain and cwd .prettierignore when ignorePath is not provided', async () => {
    await withTempDir('oxfmt-ignore-default-files-', async cwd => {
      const gitignoredFile = join(cwd, 'dist', 'a.js')
      const prettierIgnoredFile = join(cwd, 'snapshots', 'a.snap')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await mkdir(join(cwd, 'snapshots'), { recursive: true })
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(join(cwd, '.prettierignore'), '*.snap\n', 'utf8')
      await writeFile(gitignoredFile, 'console.log(1)\n', 'utf8')
      await writeFile(prettierIgnoredFile, 'snapshot\n', 'utf8')

      const byGitignore = await isOxfmtIgnored({
        cwd,
        filepath: gitignoredFile,
      })
      const byPrettierignore = await isOxfmtIgnored({
        cwd,
        filepath: prettierIgnoredFile,
      })

      expect(byGitignore).toStrictEqual({ ignored: true, reason: 'gitignore' })
      expect(byPrettierignore).toStrictEqual({
        ignored: true,
        reason: 'prettierignore',
      })
    })
  })

  it('ignores editorconfig read errors when resolving ignore status', async () => {
    await withTempDir('oxfmt-ignore-editorconfig-irrelevant-', async cwd => {
      const filepath = join(cwd, 'src', 'a.ts')
      const editorconfigPath = join(cwd, '.editorconfig')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(join(cwd, '.oxfmtrc.json'), '{}\n', 'utf8')
      await writeFile(editorconfigPath, '[*]\nindent_size = 2\n', 'utf8')
      await chmod(editorconfigPath, 0o000)

      try {
        await expect(isOxfmtIgnored({ cwd, filepath })).resolves.toStrictEqual({
          ignored: false,
        })
      } finally {
        await chmod(editorconfigPath, 0o644)
      }
    })
  })

  it('does not throw when filepath is outside ignore file directory scope', async () => {
    await withTempDir('oxfmt-ignore-parent-path-', async cwd => {
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      const filepath = resolve(cwd, '..', 'outside.ts')

      await expect(isOxfmtIgnored({ cwd, filepath })).resolves.toStrictEqual({
        ignored: false,
      })
    })
  })

  it('resolves relative filepath against provided cwd', async () => {
    await withTempDir('oxfmt-ignore-relative-filepath-', async cwd => {
      const filepath = join(cwd, 'dist', 'a.js')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(filepath, 'console.log(1)\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd,
        filepath: 'dist/a.js',
      })

      expect(result).toStrictEqual({ ignored: true, reason: 'gitignore' })
    })
  })

  it('throws for non-missing ignore file read errors', async () => {
    await withTempDir('oxfmt-ignore-read-error-', async cwd => {
      const filepath = join(cwd, 'src', 'a.ts')
      await mkdir(join(cwd, '.gitignore'), { recursive: true })
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      await expect(isOxfmtIgnored({ cwd, filepath })).rejects.toThrow(
        /EISDIR|directory/u,
      )
    })
  })

  it('uses explicit ignorePath files instead of cwd .prettierignore while keeping .gitignore', async () => {
    await withTempDir('oxfmt-ignore-explicit-', async cwd => {
      const distFile = join(cwd, 'dist', 'a.js')
      const customFile = join(cwd, 'custom', 'a.js')
      const prettierIgnoredFile = join(cwd, 'snapshots', 'a.js')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await mkdir(join(cwd, 'custom'), { recursive: true })
      await mkdir(join(cwd, 'snapshots'), { recursive: true })
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(join(cwd, '.prettierignore'), 'snapshots/**\n', 'utf8')
      await writeFile(join(cwd, '.customignore'), 'custom/**\n', 'utf8')
      await writeFile(distFile, 'console.log(1)\n', 'utf8')
      await writeFile(customFile, 'console.log(1)\n', 'utf8')
      await writeFile(prettierIgnoredFile, 'console.log(1)\n', 'utf8')

      const distResult = await isOxfmtIgnored({
        cwd,
        filepath: distFile,
        ignorePath: ['.customignore'],
      })
      const customResult = await isOxfmtIgnored({
        cwd,
        filepath: customFile,
        ignorePath: ['.customignore'],
      })
      const prettierIgnoredResult = await isOxfmtIgnored({
        cwd,
        filepath: prettierIgnoredFile,
        ignorePath: ['.customignore'],
      })

      expect(distResult).toStrictEqual({ ignored: true, reason: 'gitignore' })
      expect(customResult).toStrictEqual({
        ignored: true,
        reason: 'ignore-path',
      })
      expect(prettierIgnoredResult).toStrictEqual({ ignored: false })
    })
  })

  it('reads parent .gitignore from nested package directories up to repo boundary', async () => {
    await withTempDir('oxfmt-ignore-parent-gitignore-', async cwd => {
      const repoRoot = join(cwd, 'repo')
      const nestedDir = join(repoRoot, 'packages', 'app', 'src')
      const filepath = join(nestedDir, 'a.ts')

      await mkdir(join(repoRoot, '.git'), { recursive: true })
      await mkdir(nestedDir, { recursive: true })
      await writeFile(
        join(repoRoot, '.gitignore'),
        'packages/**/src/**\n',
        'utf8',
      )
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd: nestedDir,
        filepath,
      })

      expect(result).toStrictEqual({ ignored: true, reason: 'gitignore' })
    })
  })

  it('lets nested .gitignore negation override parent ignore rules', async () => {
    await withTempDir('oxfmt-ignore-parent-gitignore-negation-', async cwd => {
      const repoRoot = join(cwd, 'repo')
      const packageDir = join(repoRoot, 'packages', 'app')
      const filepath = join(packageDir, 'src', 'keep.ts')

      await mkdir(join(repoRoot, '.git'), { recursive: true })
      await mkdir(join(packageDir, 'src'), { recursive: true })
      await writeFile(join(repoRoot, '.gitignore'), '*.ts\n', 'utf8')
      await writeFile(join(packageDir, '.gitignore'), '!src/keep.ts\n', 'utf8')
      await writeFile(filepath, 'export const keep = true\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd: repoRoot,
        filepath,
        useCache: false,
      })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('does not read nested .gitignore files inside ignored directories', async () => {
    await withTempDir('oxfmt-ignore-ignored-parent-dir-', async cwd => {
      const repoRoot = join(cwd, 'repo')
      const packageDir = join(repoRoot, 'packages', 'app')
      const filepath = join(packageDir, 'src', 'keep.ts')

      await mkdir(join(repoRoot, '.git'), { recursive: true })
      await mkdir(join(packageDir, 'src'), { recursive: true })
      await writeFile(join(repoRoot, '.gitignore'), 'packages/app/\n', 'utf8')
      await writeFile(join(packageDir, '.gitignore'), '!src/keep.ts\n', 'utf8')
      await writeFile(filepath, 'export const keep = true\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd: repoRoot,
        filepath,
        useCache: false,
      })

      expect(result).toStrictEqual({ ignored: true, reason: 'gitignore' })
    })
  })

  it('reads .git/info/exclude from repo root', async () => {
    await withTempDir('oxfmt-ignore-git-info-exclude-', async cwd => {
      const repoRoot = join(cwd, 'repo')
      const filepath = join(repoRoot, 'src', 'excluded.ts')

      await mkdir(join(repoRoot, '.git', 'info'), { recursive: true })
      await mkdir(join(repoRoot, 'src'), { recursive: true })
      await writeFile(
        join(repoRoot, '.git', 'info', 'exclude'),
        'src/excluded.ts\n',
        'utf8',
      )
      await writeFile(filepath, 'export const excluded = true\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd: repoRoot,
        filepath,
      })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'git-info-exclude',
      })
    })
  })

  it('lets .gitignore negation override .git/info/exclude', async () => {
    await withTempDir('oxfmt-ignore-git-source-precedence-', async cwd => {
      const filepath = join(cwd, 'src', 'keep.ts')

      await mkdir(join(cwd, '.git', 'info'), { recursive: true })
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(
        join(cwd, '.git', 'info', 'exclude'),
        'src/keep.ts\n',
        'utf8',
      )
      await writeFile(join(cwd, '.gitignore'), '!src/keep.ts\n', 'utf8')
      await writeFile(filepath, 'export const keep = true\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd,
        filepath,
        useCache: false,
      })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('reads git info exclude from gitdir when .git is a file', async () => {
    await withTempDir('oxfmt-ignore-git-file-info-exclude-', async cwd => {
      const repoRoot = join(cwd, 'repo')
      const gitDir = join(cwd, 'gitdirs', 'repo.git')
      const filepath = join(repoRoot, 'src', 'excluded.ts')

      await mkdir(join(gitDir, 'info'), { recursive: true })
      await mkdir(join(repoRoot, 'src'), { recursive: true })
      await writeFile(join(repoRoot, '.git'), `gitdir: ${gitDir}\n`, 'utf8')
      await writeFile(
        join(gitDir, 'info', 'exclude'),
        'src/excluded.ts\n',
        'utf8',
      )
      await writeFile(filepath, 'export const excluded = true\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd: repoRoot,
        filepath,
      })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'git-info-exclude',
      })
    })
  })

  it('reads git info exclude from the common directory in a worktree', async () => {
    await withTempDir('oxfmt-ignore-worktree-info-exclude-', async cwd => {
      const repoRoot = join(cwd, 'repo')
      const commonDir = join(cwd, 'main.git')
      const gitDir = join(commonDir, 'worktrees', 'linked')
      const filepath = join(repoRoot, 'src', 'excluded.ts')

      await mkdir(join(commonDir, 'info'), { recursive: true })
      await mkdir(gitDir, { recursive: true })
      await mkdir(join(repoRoot, 'src'), { recursive: true })
      await writeFile(join(repoRoot, '.git'), `gitdir: ${gitDir}\n`, 'utf8')
      await writeFile(join(gitDir, 'commondir'), '../..\n', 'utf8')
      await writeFile(
        join(commonDir, 'info', 'exclude'),
        'src/excluded.ts\n',
        'utf8',
      )
      await writeFile(filepath, 'export const excluded = true\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd: repoRoot,
        filepath,
        useCache: false,
      })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'git-info-exclude',
      })
    })
  })

  it('stops default .gitignore lookup at repo boundary', async () => {
    await withTempDir('oxfmt-ignore-repo-boundary-', async cwd => {
      const outsideIgnore = join(cwd, '.gitignore')
      const repoRoot = join(cwd, 'repo')
      const filepath = join(repoRoot, 'src', 'a.ts')

      await mkdir(join(repoRoot, '.git'), { recursive: true })
      await mkdir(join(repoRoot, 'src'), { recursive: true })
      await writeFile(outsideIgnore, 'repo/src/**\n', 'utf8')
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd: repoRoot,
        filepath,
      })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('lets later explicit ignorePath negation override earlier ignorePath rules', async () => {
    await withTempDir('oxfmt-ignore-explicit-negation-', async cwd => {
      const filepath = join(cwd, 'src', 'keep.ts')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(join(cwd, '.ignore'), '*.ts\n', 'utf8')
      await writeFile(join(cwd, '.allow'), '!src/keep.ts\n', 'utf8')
      await writeFile(filepath, 'export const keep = true\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd,
        filepath,
        ignorePath: ['.ignore', '.allow'],
        useCache: false,
      })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('uses ignorePath and still respects gitignore chain and git info exclude', async () => {
    await withTempDir(
      'oxfmt-ignore-ignore-path-keeps-gitignore-',
      async cwd => {
        const repoRoot = join(cwd, 'repo')
        const gitignoredFile = join(repoRoot, 'src', 'a.ts')
        const gitInfoExcludedFile = join(repoRoot, 'logs', 'a.ts')
        const prettierIgnoredFile = join(repoRoot, 'snapshots', 'a.ts')

        await mkdir(join(repoRoot, '.git', 'info'), { recursive: true })
        await mkdir(join(repoRoot, 'src'), { recursive: true })
        await mkdir(join(repoRoot, 'logs'), { recursive: true })
        await mkdir(join(repoRoot, 'snapshots'), { recursive: true })
        await writeFile(join(repoRoot, '.gitignore'), 'src/**\n', 'utf8')
        await writeFile(
          join(repoRoot, '.git', 'info', 'exclude'),
          'logs/a.ts\n',
          'utf8',
        )
        await writeFile(
          join(repoRoot, '.prettierignore'),
          'snapshots/**\n',
          'utf8',
        )
        await writeFile(join(repoRoot, '.customignore'), 'dist/**\n', 'utf8')
        await writeFile(gitignoredFile, 'export const a = 1\n', 'utf8')
        await writeFile(gitInfoExcludedFile, 'export const a = 1\n', 'utf8')
        await writeFile(prettierIgnoredFile, 'export const a = 1\n', 'utf8')

        const gitignoredResult = await isOxfmtIgnored({
          cwd: repoRoot,
          filepath: gitignoredFile,
          ignorePath: '.customignore',
        })
        const gitInfoExcludedResult = await isOxfmtIgnored({
          cwd: repoRoot,
          filepath: gitInfoExcludedFile,
          ignorePath: '.customignore',
        })
        const prettierIgnoredResult = await isOxfmtIgnored({
          cwd: repoRoot,
          filepath: prettierIgnoredFile,
          ignorePath: '.customignore',
        })

        expect(gitignoredResult).toStrictEqual({
          ignored: true,
          reason: 'gitignore',
        })
        expect(gitInfoExcludedResult).toStrictEqual({
          ignored: true,
          reason: 'git-info-exclude',
        })
        expect(prettierIgnoredResult).toStrictEqual({ ignored: false })
      },
    )
  })

  it('applies config ignorePatterns from nearest config by default', async () => {
    await withTempDir('oxfmt-ignore-nested-', async cwd => {
      const nestedDir = join(cwd, 'packages', 'app')
      const filepath = join(nestedDir, 'local', 'a.ts')
      await mkdir(join(nestedDir, 'local'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['packages/**'] }),
        'utf8',
      )
      await writeFile(
        join(nestedDir, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['local/**'] }),
        'utf8',
      )

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })

  it('applies config ignorePatterns with gitignore directory semantics', async () => {
    await withTempDir('oxfmt-ignore-config-gitignore-dir-', async cwd => {
      const filepath = join(cwd, 'dist', 'a.ts')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['dist'] }),
        'utf8',
      )

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })

  it.each(['../src/**', '!../src/**', 'src/../dist/**', '.. '])(
    'rejects parent-directory config ignore pattern %s',
    async pattern => {
      await withTempDir('oxfmt-ignore-config-parent-pattern-', async cwd => {
        const filepath = join(cwd, 'src', 'a.ts')
        await mkdir(join(cwd, 'src'), { recursive: true })
        await writeFile(filepath, 'export const a = 1\n', 'utf8')
        await writeFile(
          join(cwd, '.oxfmtrc.json'),
          JSON.stringify({ ignorePatterns: [pattern] }),
          'utf8',
        )

        await expect(
          isOxfmtIgnored({ cwd, filepath, useCache: false }),
        ).rejects.toThrow(
          /Invalid pattern .* in `ignorePatterns`: `\.\.` is not supported/u,
        )
      })
    },
  )

  it('can disable config ignorePatterns via includeConfigIgnorePatterns=false', async () => {
    await withTempDir('oxfmt-ignore-config-toggle-', async cwd => {
      const filepath = join(cwd, 'generated', 'a.ts')
      await mkdir(join(cwd, 'generated'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['generated/**'] }),
        'utf8',
      )

      const includeConfigPatterns = await isOxfmtIgnored({
        cwd,
        filepath,
        includeConfigIgnorePatterns: true,
      })
      const excludeConfigPatterns = await isOxfmtIgnored({
        cwd,
        filepath,
        includeConfigIgnorePatterns: false,
      })

      expect(includeConfigPatterns).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
      expect(excludeConfigPatterns).toStrictEqual({ ignored: false })
    })
  })

  it('skips config loading when loadConfigForIgnorePatterns=false', async () => {
    const cwd = fixturePath('load', 'invalid-json')
    const filepath = join(cwd, 'src', 'a.ts')

    await expect(
      isOxfmtIgnored({
        cwd,
        filepath,
        loadConfigForIgnorePatterns: false,
      }),
    ).resolves.toStrictEqual({ ignored: false })
  })

  it('throws config parse error when loadConfigForIgnorePatterns=true', async () => {
    const cwd = fixturePath('load', 'invalid-json')
    const filepath = join(cwd, 'src', 'a.ts')

    await expect(
      isOxfmtIgnored({
        cwd,
        filepath,
        loadConfigForIgnorePatterns: true,
        useCache: false,
      }),
    ).rejects.toThrow(/Unexpected token|JSON/u)
  })

  it('keeps global ignore strategy when loadConfigForIgnorePatterns=false', async () => {
    await withTempDir('oxfmt-ignore-global-no-config-load-', async cwd => {
      const nodeModulesFile = join(cwd, 'node_modules', 'pkg', 'index.js')
      const lockfilePath = join(cwd, 'pnpm-lock.yaml')
      const gitignoredFile = join(cwd, 'dist', 'a.js')
      const prettierIgnoredFile = join(cwd, 'snapshots', 'a.snap')

      await mkdir(join(cwd, 'node_modules', 'pkg'), { recursive: true })
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await mkdir(join(cwd, 'snapshots'), { recursive: true })

      await writeFile(nodeModulesFile, 'export {}\n', 'utf8')
      await writeFile(lockfilePath, 'lockfileVersion: 9\n', 'utf8')
      await writeFile(gitignoredFile, 'console.log(1)\n', 'utf8')
      await writeFile(prettierIgnoredFile, 'snapshot\n', 'utf8')

      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(join(cwd, '.prettierignore'), '*.snap\n', 'utf8')
      await writeFile(join(cwd, '.oxfmtrc.json'), '{ invalid json }\n', 'utf8')

      const options = { loadConfigForIgnorePatterns: false as const }

      await expect(
        isOxfmtIgnored({ cwd, filepath: nodeModulesFile, ...options }),
      ).resolves.toStrictEqual({ ignored: true, reason: 'default-dir' })
      await expect(
        isOxfmtIgnored({ cwd, filepath: lockfilePath, ...options }),
      ).resolves.toStrictEqual({ ignored: true, reason: 'lockfile' })
      await expect(
        isOxfmtIgnored({ cwd, filepath: gitignoredFile, ...options }),
      ).resolves.toStrictEqual({ ignored: true, reason: 'gitignore' })
      await expect(
        isOxfmtIgnored({ cwd, filepath: prettierIgnoredFile, ...options }),
      ).resolves.toStrictEqual({
        ignored: true,
        reason: 'prettierignore',
      })
    })
  })

  it('keeps global ignore strategy when includeConfigIgnorePatterns=false', async () => {
    await withTempDir('oxfmt-ignore-global-only-', async cwd => {
      const nodeModulesFile = join(cwd, 'node_modules', 'pkg', 'index.js')
      const lockfilePath = join(cwd, 'pnpm-lock.yaml')
      const gitignoredFile = join(cwd, 'dist', 'a.js')
      const prettierIgnoredFile = join(cwd, 'snapshots', 'a.snap')
      const customIgnoredFile = join(cwd, 'custom', 'a.js')

      await mkdir(join(cwd, 'node_modules', 'pkg'), { recursive: true })
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await mkdir(join(cwd, 'snapshots'), { recursive: true })
      await mkdir(join(cwd, 'custom'), { recursive: true })

      await writeFile(nodeModulesFile, 'export {}\n', 'utf8')
      await writeFile(lockfilePath, 'lockfileVersion: 9\n', 'utf8')
      await writeFile(gitignoredFile, 'console.log(1)\n', 'utf8')
      await writeFile(prettierIgnoredFile, 'snapshot\n', 'utf8')
      await writeFile(customIgnoredFile, 'console.log(1)\n', 'utf8')

      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(join(cwd, '.prettierignore'), '*.snap\n', 'utf8')
      await writeFile(join(cwd, '.customignore'), 'custom/**\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({
          ignorePatterns: [
            'node_modules/**',
            'pnpm-lock.yaml',
            'dist/**',
            'snapshots/**',
            'custom/**',
          ],
        }),
        'utf8',
      )

      const options = { includeConfigIgnorePatterns: false as const }

      await expect(
        isOxfmtIgnored({ cwd, filepath: nodeModulesFile, ...options }),
      ).resolves.toStrictEqual({ ignored: true, reason: 'default-dir' })
      await expect(
        isOxfmtIgnored({ cwd, filepath: lockfilePath, ...options }),
      ).resolves.toStrictEqual({ ignored: true, reason: 'lockfile' })
      await expect(
        isOxfmtIgnored({ cwd, filepath: gitignoredFile, ...options }),
      ).resolves.toStrictEqual({ ignored: true, reason: 'gitignore' })
      await expect(
        isOxfmtIgnored({ cwd, filepath: prettierIgnoredFile, ...options }),
      ).resolves.toStrictEqual({
        ignored: true,
        reason: 'prettierignore',
      })
      await expect(
        isOxfmtIgnored({
          cwd,
          filepath: customIgnoredFile,
          ignorePath: '.customignore',
          ...options,
        }),
      ).resolves.toStrictEqual({ ignored: true, reason: 'ignore-path' })
    })
  })

  it('uses cwd-based config lookup when disableNestedConfig is true', async () => {
    await withTempDir('oxfmt-ignore-disable-nested-', async cwd => {
      const nestedDir = join(cwd, 'packages', 'app')
      const filepath = join(nestedDir, 'local', 'a.ts')
      await mkdir(join(nestedDir, 'local'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['packages/app/local/**'] }),
        'utf8',
      )
      await writeFile(
        join(nestedDir, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: [] }),
        'utf8',
      )

      const nestedEnabled = await isOxfmtIgnored({ cwd, filepath })
      const nestedDisabled = await isOxfmtIgnored({
        cwd,
        disableNestedConfig: true,
        filepath,
      })

      expect(nestedEnabled).toStrictEqual({ ignored: false })
      expect(nestedDisabled).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })

  it('only throws invalid nested config errors when the current file resolves to that config', async () => {
    await withTempDir('oxfmt-ignore-lazy-invalid-nested-', async cwd => {
      const appDir = join(cwd, 'packages', 'app')
      const brokenDir = join(cwd, 'packages', 'broken')
      const appFile = join(appDir, 'src', 'a.ts')
      const brokenFile = join(brokenDir, 'src', 'b.ts')

      await mkdir(join(appDir, 'src'), { recursive: true })
      await mkdir(join(brokenDir, 'src'), { recursive: true })
      await writeFile(appFile, 'export const a = 1\n', 'utf8')
      await writeFile(brokenFile, 'export const b = 1\n', 'utf8')

      await writeFile(join(cwd, '.oxfmtrc.json'), '{}\n', 'utf8')
      await writeFile(join(appDir, '.oxfmtrc.json'), '{}\n', 'utf8')
      await writeFile(join(brokenDir, '.oxfmtrc.json'), '{\n', 'utf8')

      await expect(
        isOxfmtIgnored({
          cwd,
          filepath: appFile,
        }),
      ).resolves.toStrictEqual({ ignored: false })

      await expect(
        isOxfmtIgnored({
          cwd,
          filepath: brokenFile,
        }),
      ).rejects.toThrow(/Failed to parse oxfmt configuration file/u)
    })
  })

  it('disables nested lookup when explicit configPath is provided', async () => {
    await withTempDir('oxfmt-ignore-explicit-config-', async cwd => {
      const nestedDir = join(cwd, 'packages', 'app')
      const filepath = join(nestedDir, 'local', 'a.ts')
      const configPath = join(cwd, '.oxfmtrc.json')
      await mkdir(join(nestedDir, 'local'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        configPath,
        JSON.stringify({ ignorePatterns: ['packages/app/local/**'] }),
        'utf8',
      )
      await writeFile(
        join(nestedDir, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: [] }),
        'utf8',
      )

      const result = await isOxfmtIgnored({
        configPath,
        cwd,
        filepath,
      })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })

  it('supports negated config ignorePatterns', async () => {
    await withTempDir('oxfmt-ignore-negated-pattern-', async cwd => {
      const filepath = join(cwd, 'src', 'keep.ts')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const keep = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['src/**', '!src/keep.ts'] }),
        'utf8',
      )

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('applies config ignorePatterns in order with last match taking precedence', async () => {
    await withTempDir('oxfmt-ignore-pattern-order-', async cwd => {
      const filepath = join(cwd, 'src', 'a.ts')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['src/**', '!src/**'] }),
        'utf8',
      )
      const unignored = await isOxfmtIgnored({ cwd, filepath })

      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['!src/**', 'src/**'] }),
        'utf8',
      )
      const ignored = await isOxfmtIgnored({
        cwd,
        filepath,
        useCache: false,
      })

      expect(unignored).toStrictEqual({ ignored: false })
      expect(ignored).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })
})
