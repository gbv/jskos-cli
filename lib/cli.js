/**
 * Commander instance with common settings.
 */
const cli = require("commander")
const jskos = require("jskos-tools")

cli.version(require("../package.json").version + " based on JSKOS " + jskos.version)

// common options
cli.option("-q, --quiet", "suppress status messages")
cli.log = msg => {
  if (!cli.quiet) {
    console.log(msg)
  }
}

// print a list of JSKOS object types
cli.option("--list-types", "list JSKOS object types")
cli.on("option:list-types", () => {
  Object.keys(jskos.objectTypes).forEach(name => console.log(name))
  process.exit()
})

// Support examples in help output
cli.example = example => {
  (cli._examples = cli._examples || []).push(example)
  return cli
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
