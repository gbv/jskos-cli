/* eslint-disable no-unreachable */
import fs from "fs"
import { resolve } from "path"
import { dirname } from "../lib/util.js"

const exampleFile = name => resolve(dirname(import.meta.url), "../examples/", name)
const jsonFile = name => JSON.parse(fs.readFileSync(exampleFile(name)))
import convert from "../lib/jskos-convert.js"
import { Writable } from "stream"

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
          throw new Error(`Unexpected chunk`, chunk)
        }
        if (expectedJSON.trim() === "") {
          done()
        }
      }
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

})
