const ndjson = require("ndjson")

const csvSerializer = require("csv-stringify")
const csvParser = require("csv-parse")

const { flattenMapping } = require("jskos-tools")
const { Transform } = require("stream")

function mappingsToRows(options = {}) {
  return new Transform({
    objectMode: true,
    transform(mapping, encoding, callback) {
      this.push(flattenMapping(mapping, options))
      callback()
    }
  })
}

function transformMappings(opts) {
  const { from, to, language } = opts

  let delimiter = ";"
  let columns = language 
    ? ["fromNotation","fromLabel","toNotation","toLabel","type"]
    : ["fromNotation","toNotation","type"]

  let parser = from === "csv"
    ? csvParser({ delimiter })
    : ndjson.parse()

  let serializer = to === "csv"
    ? csvSerializer({ delimiter, columns }) 
    : ndjson.serialize()

  if (to === "csv") {
    serializer.write(columns)
  }

  let converter
  if (from === "ndjson" && to === "csv") {
    converter = mappingsToRows({language})
  }
  // TODO: csv to ndjson

  let pipeline = converter 
    ? [parser, converter, serializer]
    : [parser, serializer]

  return pipeline
}

function transformConcepts() {
  return []
}

function convert (opts) {
  let { input, output } = opts
  let pipeline = opts.type === "mapping"
    ? transformMappings(opts)
    : transformConcepts(opts) // TODO: transform other object types as well
  while(pipeline.length) {
    input = input.pipe(pipeline.shift())
  }
  input.pipe(output)
}

module.exports = convert