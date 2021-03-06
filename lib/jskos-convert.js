const ndjson = require("ndjson")

const csvSerializer = require("csv-stringify")
const csvParser = require("csv-parse")

const validator = require("./validator")

const mappingsToRows = require("./mapping-to-csv")

const conceptsFromRows = require("./csv-to-concept")
const rowsFromConcepts = require("./concept-to-csv")

const { ConceptScheme } = require("jskos-tools")

const rdfSerializer = require("./rdf-serializer")

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
  let { from, to, type, language, registry, scheme, marktop } = opts

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

  // build steps
  let steps = [parsers[from]]

  if (type === "mapping" && from === "ndjson" && to === "csv") {
    steps.push(mappingsToRows({language}))
    if (opts.validate) {
      steps.push(validator(opts))
    }
  } else if (type === "concept") {
    if (!scheme && (from === "csv" || to === "csv")) {
      throw new Error("Cannot convert concepts from/to CSV without scheme!")
    }
    if (from === "csv") {
      steps.push(conceptsFromRows({language, scheme, marktop}))
    }
    if (opts.validate) {
      steps.push(validator(opts))
    }
    if (to === "csv") {
      steps.push(rowsFromConcepts({language, scheme}))
    }
  }

  steps.push(initializeSerializer(opts))

  return steps
}

function initializeSerializer(config) {
  const { to, type, language } = config

  if (to === "csv") {
    var columns
    if (type === "mapping") {
      columns = language
        ? ["fromNotation","fromLabel","toNotation","toLabel","type"]
        : ["fromNotation","toNotation","type"]
    } else {
      columns = language
        ? ["notation", "prefLabel", "broaderNotation", "scopeNote"]
        : ["notation", "broaderNotation"]
    }
    // TODO: only selected language?
    var serializer = csvSerializer({ delimiter: ";", columns })
    serializer.write(columns)
    return serializer
  } else if (to in rdfSerializer.formats) {
    return rdfSerializer(to)
  } else {
    throw new Error(`Serialization format "${to}" not supported!`)
  }
}

module.exports = convert
