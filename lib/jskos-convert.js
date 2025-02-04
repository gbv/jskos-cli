import ndjson from "ndjson"

import { stringify as csvStringify } from "csv-stringify/sync"
import { parse as csvParser } from "csv-parse"

import validator from "./validator.js"

import mappingsToRows from "./mapping-to-csv.js"
import mappingsFromRows from "./csv-to-mapping.js"

import conceptsFromRows from "./csv-to-concept.js"
import rowsFromConcepts from "./concept-to-csv.js"

import { ConceptScheme } from "jskos-tools"

import rdfSerializer from "./rdf-serializer.js"
import { formats } from "./rdf-serializer.js"

import stream from "stream"

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
  let { from, to, type, language, registry, scheme, destination, marktop, clean, partof, creator, created } = opts

  if (scheme && !(scheme instanceof ConceptScheme)) {
    scheme = selectScheme(registry, scheme)
  }
  if (destination && !(destination instanceof ConceptScheme)) {
    destination = selectScheme(registry, destination)
  }

  if (type === "concept" && (!scheme?.namespace && !scheme?.uriPattern)) {
    throw new Error("Converting concepts requires `namespace` or `uriPattern` on the associated scheme.")
  }

  // build steps
  let steps = []
  if (from === "csv") {
    const delimiter = opts.delimiter || ","
    steps.push(csvParser({ delimiter, columns: true }))
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
      steps.push(mappingsFromRows({ language, fromScheme: scheme, toScheme: destination, partOf: partof, creator, created }))
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
    let columns
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
    const delimiter = config.delimiter || ","
    const serializer = csvStringify({ delimiter, columns })
    serializer.write(columns)
    return serializer
  } else if (to in formats) {
    return rdfSerializer(to)
  } else {
    throw new Error(`Serialization format "${to}" not supported!`)
  }
}

export default convert
