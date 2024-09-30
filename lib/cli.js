/**
 * Commander instance with common settings for JSKOS command line tools.
 */
import { Command } from "commander"
import * as jskos from "jskos-tools"
import * as validate from "jskos-validate"
import { readJSONFile } from "./util.js"

const cli = new Command()

const packageJson = await readJSONFile("../package.json", import.meta.url)
cli.version(packageJson.version + " based on JSKOS " + validate.version)

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

// parse arguments and emit help if none given
cli.parseArgs = args => {
  cli.parse(args)

  if (!cli.args.length) {
    cli.help()
  }

  return cli.args
}

export default cli
