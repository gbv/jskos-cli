import gbv from "eslint-config-gbv"

export default [
  ...gbv,
  {
    files: [
      "bin/jskos-convert",
      "bin/jskos-validate",
      "bin/jskos-enrich",
    ],
  },
  {
    ignores: [
      "src/lax.js",
      "src/strict.js",
      "jskos",
    ],
  },
]
