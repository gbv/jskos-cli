const ndjson = require("ndjson")

const csvSerializer = require("csv-stringify")
const csvParser = require("csv-parse")

const validator = require("./validator")

const mappingsToRows = require("./mapping-to-csv")

const conceptsFromRows = require("./csv-to-concept")
const rowsFromConcepts = require("./concept-to-csv")

const { ConceptScheme } = require("jskos-tools")

function selectScheme(registry, scheme) {
  if (!registry || !registry.schemes) return
  scheme = registry.schemes.find(s => {
    return s.uri === scheme || (s.notation && s.notation[0] === scheme)
  })
  return scheme ? new ConceptScheme(scheme) : null
}

const parsers = {
  csv: csvParser({ separator: ";", columns: true }),
  ndjson: ndjson.parse(),
}

function convert (opts) {
  let { input, output, from, to, type, language, registry, scheme, marktop } = opts
  let delimiter = ";"

  if (scheme && !(scheme instanceof ConceptScheme)) {
    if (!registry || !registry.schemes) {
      throw new Error("Please specify a registry with schemes!")
    } else {
      scheme = selectScheme(registry, scheme)
      if (!scheme) {
        throw new Error("Could not find selected scheme in registry!")
      }
    }
  }

  // build pipeline
  let pipeline = [parsers[from]]

  if (type === "mapping" && from === "ndjson" && to === "csv") {
    pipeline.push(mappingsToRows({language}))
  } else if (type === "concept") {
    if (!scheme && (from === "csv" || to === "csv")) {
      throw new Error("Cannot convert concepts from/to CSV without scheme!")
    }
    if (from === "csv") {
      pipeline.push(conceptsFromRows({language, scheme, marktop}))
    }
    if (to === "csv") {
      pipeline.push(rowsFromConcepts({language, scheme}))
    }
  }

  if (opts.validate) {
    pipeline.push(validator(opts))
  }

  // configure serializer
  let serializer = ndjson.serialize()

  if (to === "csv") {
    let columns
    if (type === "mapping") {
      columns = opts.language
        ? ["fromNotation","fromLabel","toNotation","toLabel","type"]
        : ["fromNotation","toNotation","type"]
    } else {
      columns = opts.language
        ? ["notation", "prefLabel", "broaderNotation", "scopeNote"]
        : ["notation", "broaderNotation"]
    }
    serializer = csvSerializer({ delimiter, columns })
    serializer.write(columns)
  }

  pipeline.push(serializer)

  // process pipeline
  while(pipeline.length) {
    input = input.pipe(pipeline.shift())
  }
  input.pipe(output)
}

module.exports = convert
