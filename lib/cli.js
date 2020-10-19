/**
 * Commander instance with common settings.
 */
const cli = require("commander")
const jskos = require("jskos-tools")
const validate = require("jskos-validate")

cli.version(require("../package.json").version + " based on JSKOS " + validate.version)

// common options
cli.option("-q, --quiet", "suppress status messages")
cli.log = msg => {
  if (!cli.quiet) {
    console.log(msg)
  }
}
cli.warn = msg => {
  if (!cli.quiet) {
    console.warn(msg)
  }
}
cli.error = msg => {
  if (!cli.quiet) {
    console.error(msg)
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
