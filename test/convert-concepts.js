const fs = require("fs")
const { resolve } = require("path")
const exampleFile = name => resolve(__dirname, "../examples/", name)
const jsonFile = name => JSON.parse(fs.readFileSync(exampleFile(name)))
const convert = require("../lib/jskos-convert")

describe("convert-concepts", () => {

  it("converts concepts with level", (done) => {
    const input = fs.createReadStream(exampleFile("scheme-levels.csv"))
    
    const output = process.stdout
    const registry = jsonFile("registry.json")
    const scheme = "example"

    convert({ from: "csv", to: "ndjson", type: "concept", input, output, registry, scheme })

    // TODO: convert should return stream instead
    done()
  })

})
