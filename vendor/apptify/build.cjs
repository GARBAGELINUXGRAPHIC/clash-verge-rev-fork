// Regenerate the runtime from the byte-for-byte upstream snapshot.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const viteRequire = createRequire(require.resolve('vite'))
const esbuild = viteRequire('esbuild')
const postcss = viteRequire('postcss')
const root = __dirname
const output = path.resolve(root, '../../src/components/base/apptify')
async function build() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')))
  for (const [file, hash] of Object.entries(manifest.files)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
    if (actual !== hash) throw new Error(`Upstream snapshot changed: ${file}`)
  }
  await esbuild.build({
    stdin: { contents: "export { AppleDatePicker } from './src/components/date-picker'; export { appleKey, createApple, themeStyle, resolveMotion } from './src/core/context'", resolveDir: root },
    bundle: true, format: 'esm', platform: 'browser',
    external: ['vue', 'vuetify/*', 'date-fns', 'lucide-vue-next'],
    outfile: path.join(output, 'date-picker.js'),
  })
  const css = ['base', 'forms', 'content', 'date-picker', 'ripple'].map(name => fs.readFileSync(path.join(root, `src/styles/${name}.css`), 'utf8')).join('\n')
  const stylesheet = postcss.parse(css)
  stylesheet.walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return
    rule.selectors = rule.selectors.map(selector => `.apptify-date-picker ${selector}`)
  })
  fs.writeFileSync(path.join(output, 'date-picker.css'), stylesheet.toString())
  console.log(`Verified ${Object.keys(manifest.files).length} original files and rebuilt AppleDatePicker.`)
}
build().catch(error => { console.error(error); process.exitCode = 1 })
