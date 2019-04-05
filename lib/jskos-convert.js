const ndjson = require("ndjson")

const csvSerializer = require("csv-stringify")
const csvParser = require("csv-parse")

const { flattenMapping, validate } = require("jskos-tools")
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

function convert (opts) {
  let { input, output, from, to, type, language } = opts
  let delimiter = ";"

  // build pipeline
  let parser = from == "csv" ? csvParser({ delimiter }) : ndjson.parse()
  let pipeline = [ parser ]

  if (type === "mapping" && from === "ndjson" && to === "csv") {
    pipeline.push(mappingsToRows({language}))
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
