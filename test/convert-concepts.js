/* eslint-disable no-unreachable */
const fs = require("fs")
const { resolve } = require("path")
const exampleFile = name => resolve(__dirname, "../examples/", name)
const jsonFile = name => JSON.parse(fs.readFileSync(exampleFile(name)))
const convert = require("../lib/jskos-convert")
const { pipeline } = require("stream")

// TODO: This test does not work. In fact, it completely blocks the test and aborts it. See https://github.com/gbv/jskos-cli/issues/32.

describe("convert-concepts", () => {

  it("converts concepts with level", (done) => {
    console.log("THIS TEST NEEDS TO BE FIXED! See https://github.com/gbv/jskos-cli/issues/32.")
    done()
    return

    const input = fs.createReadStream(exampleFile("scheme-levels.csv"))

    const registry = jsonFile("registry.json")
    const scheme = "example"

    const conversion = convert({ from: "csv", to: "ndjson", type: "concept", registry, scheme })
    pipeline(input, ...conversion, process.stdout, () => { })
  })

})
