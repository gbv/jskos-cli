/**
 * Commander instance with common settings.
 */
const cli = require("commander")
const jskos = require("jskos-tools")

cli.version(require("../package.json").version + " based on JSKOS " + jskos.version)

cli.example = example => {
  (cli._examples = cli._examples || []).push(example)
}

cli.on("--help", () => {
  if (cli._examples) {
    console.log("")
    console.log("Examples:")
    cli._examples.forEach(example => {
      console.log(`  $ ${cli._name} ${example}`)
    })
  }
})

module.exports = cli
