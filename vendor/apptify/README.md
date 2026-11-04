# Original Apptify AppleDatePicker

This is a byte-for-byte snapshot of the local Apptify 0.6.2 date picker and
its runtime dependencies. `manifest.json` records SHA-256 hashes. Do not edit
these upstream files to adapt React behavior.

The React bridge is `src/components/base/apple-date-picker.tsx`. It mounts the
original Vue component, provides the original Apple context, synchronizes
modelValue and the application's theme, and disposes the Vue app on unmount.
Calendar, time wheels, validation, ripple, popup placement, transitions and
icons all run the original implementation.

Run `node vendor/apptify/build.cjs` to verify the snapshot and regenerate the
checked-in ESM bundle and CSS. The script uses Vite's esbuild/postcss tools.
CSS declarations are unchanged; selectors receive the `.apptify-date-picker`
ancestor to avoid changing the other controls in this React application.
The separate bridge CSS restores inheritance of tokens overridden by existing
React `.apple-field` styles. Dependencies are pinned to the upstream runtime.

Current integration: Hysteria2 temporary settings, custom expiration date/time.
Preview verification uses mock IPC only; it does not operate the running core.

## Original AppleSlider

`src/components/slider.ts` contains unchanged declarations copied from the
local Apptify `src/components/forms.ts`: `AppleSlider`, its field helpers and
shared props. Only the Vue import is narrowed to the required symbols.
`src/styles/slider.css` contains the original slider and field CSS rules.
The manifest records both the copied files and the complete source-file hashes.

`node vendor/apptify/build-slider.cjs` generates `apptify/slider.js` and scopes its CSS to
`.apptify-slider`. `src/components/base/apple-slider.tsx` synchronizes React
props and theme tokens; the original Vue component owns the range input,
keyboard interaction and progress calculation. Hysteria2 settings pair it with
an editable numeric input.
