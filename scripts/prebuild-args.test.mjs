import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePrebuildArgs } from './prebuild-args.mjs'

test('pasted zsh comment does not become a target triple', () => {
  assert.deepEqual(
    parsePrebuildArgs(['--force', '#', 'Re-download', 'and', 'overwrite']),
    {
      force: true,
      target: undefined,
    },
  )
})

test('force works on either side of an explicit target', () => {
  const target = 'aarch64-apple-darwin'
  for (const args of [
    [target, '--force'],
    ['-f', target],
  ]) {
    assert.deepEqual(parsePrebuildArgs(args), { force: true, target })
  }
})

test('invalid flags and additional targets fail clearly', () => {
  assert.throws(
    () => parsePrebuildArgs(['--unknown']),
    /Unknown prebuild option/,
  )
  assert.throws(
    () => parsePrebuildArgs(['aarch64-apple-darwin', 'extra']),
    /only one target/,
  )
})
