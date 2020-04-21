const fs = require("fs")
const { resolve } = require("path")
const exampleFile = name => resolve(__dirname, "../examples/", name)
const jsonFile = name => JSON.parse(fs.readFileSync(exampleFile(name)))
const convert = require("../lib/jskos-convert")
const { pipeline } = require("stream")

describe("convert-concepts", () => {

  it("converts concepts with level", (done) => {
    const input = fs.createReadStream(exampleFile("scheme-levels.csv"))
    
    const registry = jsonFile("registry.json")
    const scheme = "example"

    const conversion = convert({ from: "csv", to: "ndjson", type: "concept", registry, scheme })
    pipeline(input, ...conversion, process.stdout, () => { })
    done()
  })

})
