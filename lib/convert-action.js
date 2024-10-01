import fs from "fs"
import needle from "needle"
import convert from "./jskos-convert.js"
import { ConceptScheme } from "jskos-tools"
import { Writable } from "stream"

export default (options, type, files) => {

  const to = options.to || "ndjson"
  let { scheme, destination, exitProcess = false } = options

  let registry = {}
  if (options.registry) {
    let json, data = fs.readFileSync(options.registry, "utf8")
    // Support .ndjson
    if (options.registry.endsWith(".ndjson")) {
      data = "[" + data.split("\n").filter(Boolean).join(",") + "]"
    }
    json = JSON.parse(data)
    registry = Array.isArray(json) ? { schemes: json } : json
  }
  const output = new Writable({
    write(chunk, encoding, callback) {
      process.stdout.write(chunk,callback)
    },
  })

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

  let errorCode = 0, lastStream

  while (files.length > 0) {
    let file = files.shift()
    let input = process.stdin
    let from = options.from

    if (file.match(/https?:\/\//)) {
      input = needle.get(file)
    } else if (file !== "-") {
      input = fs.createReadStream(file)
    }

    let ext = file.match(/\.(csv|ndjson)$/)
    if (!from && ext) {
      from = ext[1]
    }

    from = from || "ndjson"
    input.on("error", e => {
      console.error(`${file}: ${e.message}`)
    })
    try {
      let steps = convert({ ...options, from, to, type, registry, scheme, destination })
      //pipeline(input, steps[0], output, (err) => { if (err) console.error(err.message) })

      let stream = input
      for (let i=0; i<steps.length; i++) {
        stream = stream.pipe(steps[i])
      }
      lastStream = stream.pipe(output)
    } catch(e) {
      console.error(e.message)
      errorCode = 1
    }
  }

  // Exit process with error code if option is given
  if (exitProcess) {
    lastStream?.on("finish", () => {
      process.exit(errorCode)
    }) || process.exit(errorCode)
  }

}
