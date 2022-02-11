const fs = require("fs")
const request = require("request")
const convert = require("./jskos-convert")
const { ConceptScheme } = require("jskos-tools")

module.exports = (options, type, files) => {

  const to = options.to || "ndjson"
  var { language, validate, scheme, destination, marktop, partof } = options

  const registry = {}
  if (options.registry) {
    let json = fs.readFileSync(options.registry)
    Object.assign(registry, JSON.parse(json))
  }
  const output = process.stdout

  output.on("error", err => {
    if (err.code == "EPIPE") {
      process.exit(0)
    }
  })

  if (scheme && fs.existsSync(scheme)) {
    const schemeData = JSON.parse(fs.readFileSync(scheme).toString())
    scheme = new ConceptScheme(Array.isArray(schemeData) ? schemeData[0] : schemeData)
  }

  if (destination && fs.existsSync(destination)) {
    destination = new ConceptScheme(JSON.parse(fs.readFileSync(destination).toString()))
  }

  while (files.length > 0) {
    let file = files.shift()
    let input = process.stdin
    let from = options.from
    let clean = options.clean

    if (file.match(/https?:\/\//)) {
      input = request.get(file)
    } else if (file !== "-") {
      input = fs.createReadStream(file)
    }

    let ext = file.match(/\.(csv|ndjson)$/)
    if (!from && ext) {
      from = ext[1]
    }

    from = from || "ndjson"
    input.on("error", e => { console.error(`${file}: ${e.message}`) })
    try {
      let steps = convert({ from, to, type, language, validate, registry, scheme, destination, partof, marktop, clean })
      //pipeline(input, steps[0], output, (err) => { if (err) console.error(err.message) })

      let stream = input
      for (let i=0; i<steps.length; i++) {
        stream = stream.pipe(steps[i])
      }
      stream.pipe(output)
    } catch(e) {
      console.error(e.message)
    }
  }
}
