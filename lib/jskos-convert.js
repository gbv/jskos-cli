const ndjson = require("ndjson")

const csvSerializer = require("csv-stringify")
const csvParser = require("csv-parse")

const validator = require("./validator")

const mappingsToRows = require("./mapping-to-csv")
const mappingsFromRows = require("./csv-to-mapping")

const conceptsFromRows = require("./csv-to-concept")
const rowsFromConcepts = require("./concept-to-csv")

const { ConceptScheme } = require("jskos-tools")

const rdfSerializer = require("./rdf-serializer")

const stream = require("stream")

const cleanItems = new stream.Transform({
  objectMode: true,
  transform(item, enc, done) {
    // language map of list
    ["altLabel", "hiddenLabel", "scopeNote", "definition", "example", "historyNote", "editorialNote", "changeNote", "note"].forEach(key => {
      if (key in item) {
        for (let lang in item[key]) {
          if (typeof item[key][lang] === "string") {
            item[key][lang] = [ item[key][lang] ]
          }
        }
      }
    })
    this.push(item)
    done()
  },
})

function selectScheme(registry, scheme) {
  if (scheme instanceof ConceptScheme) {
    return scheme
  } else if (!registry || !registry.schemes) {
    throw new Error("Please specify a registry with schemes!")
  } else {
    // TODO: also search by identifier?
    scheme = registry.schemes.find(s => {
      return s.uri === scheme || (s.notation && s.notation[0] === scheme)
    })
    if (scheme) {
      return new ConceptScheme(scheme)
    } else {
      throw new Error("Could not find selected scheme in registry!")
    }
  }
}

function convert (opts) {
  let { from, to, type, language, registry, scheme, destination, marktop, clean, partof } = opts

  if (scheme && !(scheme instanceof ConceptScheme)) {
    scheme = selectScheme(registry, scheme)
  }
  if (destination && !(destination instanceof ConceptScheme)) {
    destination = selectScheme(registry, destination)
  }

  // build steps
  let steps = []
  if (from === "csv") { 
    steps.push(csvParser({ separator: ";", columns: true }))
  } else if(from === "ndjson") {
    steps.push(ndjson.parse())
    if (clean) {
      steps.push(cleanItems)
    }
  }

  if (type === "mapping") {
    if (from === "ndjson" && to === "csv") {
      steps.push(mappingsToRows({language}))
    } else if (from === "csv" && to === "ndjson") {
      steps.push(mappingsFromRows({language,scheme,destination,partof}))
    }
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
