export function parsePrebuildArgs(args) {
  let force = false
  let target
  for (const arg of args) {
    // Interactive zsh may pass pasted shell comments as literal arguments.
    if (arg.startsWith('#')) break
    if (arg === '--force' || arg === '-f') {
      force = true
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown prebuild option: ${arg}`)
    } else if (target) {
      throw new Error('prebuild accepts only one target triple')
    } else {
      target = arg
    }
  }
  return { force, target }
}
