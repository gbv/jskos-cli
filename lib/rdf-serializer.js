import { Transform } from "stream"
import jsonld from "jsonld"
import ndjson from "ndjson"

import { readJSONFile } from "./util.js"
const context = await readJSONFile("./context.json", import.meta.url)

const supportedFormats = {
  nt: "N-Triples",
  ntriples: "N-Triples",
  nquads: "N-Triples",
  jsonld: "JSON-LD",
  ndjson: "JSON-LD",
  json: "JSON-LD",
  jskos: "JSON-LD",
}

/**
 * Converts JSKOS to RDF serialization.
 */
const convertJSKOS = format => {
  if (format in supportedFormats) {
    format = supportedFormats[format]

    if (format === "JSON-LD") {
      return ndjson.stringify()
    }

    return new Transform({
      objectMode: true,
      transform(doc, encoding, callback) {
        doc["@context"] = context
        jsonld.toRDF(doc, {format: "application/n-quads"}).then(rdf => {
          this.push(rdf)
          callback()
        })
      },
    })

  } else {
    throw new Error(`RDF serialization "${format}" not supported!`)
  }
}

export { convertJSKOS as default, supportedFormats as formats }
