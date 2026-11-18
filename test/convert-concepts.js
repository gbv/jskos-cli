 
import assert from "assert"
import fs from "fs"
import { resolve } from "path"
import { dirname } from "../lib/util.js"

const exampleFile = name => resolve(dirname(import.meta.url), "../examples/", name)
const jsonFile = name => JSON.parse(fs.readFileSync(exampleFile(name)))
import convert from "../lib/jskos-convert.js"
import { Readable, Writable } from "stream"

describe("convert-concepts", () => {

  it("converts concepts with level", (done) => {

    let expectedJSON = fs.readFileSync(exampleFile("scheme.ndjson"), "utf8")

    const outStream = new Writable({
      write(chunk, encoding, callback) {
        chunk = chunk.toString()
        if (expectedJSON.startsWith(chunk)) {
          expectedJSON = expectedJSON.replace(chunk, "")
          callback()
        } else {
          throw new Error("Unexpected chunk", chunk)
        }
        if (expectedJSON.trim() === "") {
          done()
        }
      },
    })

    const input = fs.createReadStream(exampleFile("scheme-levels.csv"))

    const registry = jsonFile("registry.json")
    const scheme = "example"

    const steps = convert({ from: "csv", to: "ndjson", type: "concept", registry, scheme })

    let stream = input
    for (let i = 0; i < steps.length; i += 1) {
      stream = stream.pipe(steps[i])
    }
    stream.pipe(outStream)
  })

  it("splits broaderNotation at |", async () => {
    const input = Readable.from([
      "level,notation,prefLabel,broaderNotation\n" +
      "0,data,Data,\n" +
      "1,json,JSON,\n" +
      "2,json-ld,JSON-LD,json|rdf\n" +
      "3,jskos,JSKOS,\n" +
      "1,rdf,RDF,\n",
    ])
    const registry = {
      schemes: [{ uri: "http://example.com/", notation: ["example"], namespace: "http://example.com/" }],
    }
    const steps = convert({ from: "csv", to: "ndjson", type: "concept", registry, scheme: "example" })

    let stream = input
    for (const step of steps) {
      stream = stream.pipe(step)
    }

    let output = ""
    for await (const chunk of stream) {
      output += chunk
    }
    const concepts = output.trim().split("\n").map(JSON.parse)
    const jsonLd = concepts.find(concept => concept.notation[0] === "json-ld")
    const jskos = concepts.find(concept => concept.notation[0] === "jskos")

    assert.deepEqual(jsonLd.broader.map(concept => concept.notation[0]), ["json", "rdf"])
    assert.deepEqual(jskos.broader.map(concept => concept.notation[0]), ["json-ld"])
  })

})
