const ndjson = require("ndjson")

const csvSerializer = require("csv-stringify")
const csvParser = require("csv-parse")

const { flattenMapping, validate, ConceptScheme } = require("jskos-tools")
const { Transform } = require("stream")

function mappingsToRows(options = {}) {
  return new Transform({
    objectMode: true,
    transform(mapping, encoding, callback) {
      const row = flattenMapping(mapping, options) 
      // TODO: parse notation from URI if not given explicitly
      this.push(row)
      callback()
    }
  })
}

function conceptsFromRows(options = {}) {
  const language = options.language || "en"
  const scheme = options.scheme
      
  // TODO: support fields `level` and `broaderNotation`
  const stack = []

  return new Transform({
    objectMode: true,
    transform(row, encoding, callback) {
      const { notation, prefLabel } = row

      const concept = scheme.conceptFromNotation(notation)
      if (concept) {
        if (prefLabel) {
          concept.prefLabel = {[language]: prefLabel}
        }

        let { broaderNotation } = row
        let level = parseInt(row.level)
        if (level < 0) {
          console.error(`invalid level ${level} at ${notation}`)
          level = 0
        }          

        if (!isNaN(level)) {
          if (!stack.length) { // first concept
            stack[level] = notation
          }
          
          if (level !== stack.length - 1) {
            // keep it
          } else if (level > stack.length - 1) {
            if (level !== stack.length) {
              console.error(`invalid level jump to ${level} at ${notation}`)
            }
            // deeper
          } else {
            while (level < stack.length - 1) stack.pop()
            // TODO: broaderNotation
          }

          stack[level] = notation
          if (level > 0) {
            broaderNotation = stack[level - 1]
          } else {
            concept.topConceptOf = [{uri:scheme.uri}]
          }
        }

        if (broaderNotation !== undefined) {
          concept.broader = [{notation: [broaderNotation]}]
        }

        this.push(concept)
      } else {
        console.error(`Invalid notation: ${notation}`)
      }

      callback()
    }
  })
}

function validator(opts) {
  const { type } = opts
  return new Transform({
    objectMode: true,
    transform(object, encoding, callback) {
      if (validate[type](object)) {
        this.push(object)
      } else {
        console.error(`invalid ${type}`)
      }
      callback()
    }
  })
}

const csvColumns = {
  mapping(opts) {
    return columns = opts.language
      ? ["fromNotation","fromLabel","toNotation","toLabel","type"]
      : ["fromNotation","toNotation","type"]
  }
}

function selectScheme(registry, scheme) {
  if (!registry || !registry.schemes) return
  scheme = registry.schemes.find(s => {
    return s.uri === scheme || (s.notation && s.notation[0] === scheme)
  })
  return scheme ? new ConceptScheme(scheme) : null
}

function parser (options = {}) {
  const { from } = options
  const separator = ";"

  return from === "csv"
    ? csvParser({ separator, columns: true })
    : ndjson.parse()
}

function convert (opts) {
  let { input, output, from, to, type, language, registry, scheme } = opts
  let delimiter = ";"

  if (scheme) {
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
  let pipeline = [parser(opts)]

  if (type === "mapping" && from === "ndjson" && to === "csv") {
    pipeline.push(mappingsToRows({language}))
  } else if (type === "concept" && from === "csv") {
    if (scheme) {
      pipeline.push(conceptsFromRows({language, scheme}))
    } else {
      throw new Error("Cannot convert mappings from CSV without known scheme!")
    }
  }

  if (opts.validate) {
    pipeline.push(validator(opts))
  }

  let serializer = ndjson.serialize()
  if (to === "csv") {
    if (type in csvColumns) {
      let columns = csvColumns[type](opts)
      serializer = csvSerializer({ delimiter, columns })
      serializer.write(columns)
    } else {
      console.error(`${type} does not support CSV output`)
    }
  }

  pipeline.push(serializer)

  // process pipeline
  while(pipeline.length) {
    input = input.pipe(pipeline.shift())
  }
  input.pipe(output)
}

module.exports = convert
