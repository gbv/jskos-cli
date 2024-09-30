import gbv from "eslint-config-gbv"

export default [
  ...gbv,
  {
    files: [
      "bin/jskos-convert",
      "bin/jskos-validate",
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
