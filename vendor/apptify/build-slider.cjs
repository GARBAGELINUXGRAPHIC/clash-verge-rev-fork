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
  for (const file of ['src/components/slider.ts', 'src/styles/slider.css']) {
    const actual = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, file)))
      .digest('hex')
    if (actual !== manifest.files[file])
      throw new Error(`Upstream slider snapshot changed: ${file}`)
  }
  await esbuild.build({
    entryPoints: [path.join(root, 'src/components/slider.ts')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['vue'],
    outfile: path.join(output, 'slider.js'),
  })
  const stylesheet = postcss.parse(
    fs.readFileSync(path.join(root, 'src/styles/slider.css'), 'utf8'),
  )
  stylesheet.walkRules((rule) => {
    rule.selectors = rule.selectors.map(
      (selector) => `.apptify-slider ${selector}`,
    )
  })
  fs.writeFileSync(path.join(output, 'slider.css'), stylesheet.toString())
  console.log('Verified the original AppleSlider source and CSS; rebuilt both.')
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
