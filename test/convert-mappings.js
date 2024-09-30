import assert from "assert"
import { ConceptScheme } from "jskos-tools"
import mappingsFromRows from "../lib/csv-to-mapping.js"

// { fromNotation: "612.111", toNotation: "4070945-0", type: "exact" }
// { fromNotation: "612.112", toNotation: "4074195-3", type: "exact" }

describe("convert-mappings", () => {
  it("converts mappings from csv to JSKOS", (done) => {
    const fromScheme = new ConceptScheme({
      uri: "http://example.org/voc",
      notationPattern: "[A-Z][0-9]*",
      namespace: "http://example.org/voc/",
    })
    const toScheme = new ConceptScheme({
      uri: "http://example.com/voc",
      notationPattern: "[a-z]",
      namespace: "http://example.com/voc/",
    })
    const transform = mappingsFromRows({fromScheme, toScheme})

    const input = [
      { fromNotation: "A1", toNotation: "x" },
      { fromNotation: "X2", toNotation: "y", type: "=" },
    ]
    const output = [
      {
        from: {
          memberSet: [{
            notation: ["A1"],
            uri: "http://example.org/voc/A1",
          }],
        },
        fromScheme: { uri: "http://example.org/voc" },
        to: {
          memberSet: [{
            notation: ["x"],
            uri: "http://example.com/voc/x",
          }],
        },
        toScheme: { uri: "http://example.com/voc" },
        type: [ "http://www.w3.org/2004/02/skos/core#mappingRelation" ],
      },
      {
        from: {
          memberSet: [{
            notation: ["X2"],
            uri: "http://example.org/voc/X2",
          }],
        },
        fromScheme: { uri: "http://example.org/voc" },
        to: {
          memberSet: [{
            notation: ["y"],
            uri: "http://example.com/voc/y",
          }],
        },
        toScheme: { uri: "http://example.com/voc" },
        type: [ "http://www.w3.org/2004/02/skos/core#exactMatch" ],
      },
    ]
    // Test creator (use first input)
    // Creator 1: only URI
    input.push({ ...input[0], creator: "https://example.com" })
    output.push({ ...output[0], creator: [{ uri: "https://example.com" }] })
    // Creator 2: only name
    input.push({ ...input[0], creator: "Test" })
    output.push({ ...output[0], creator: [{ prefLabel: { en: "Test" } }] })
    // Creator 3: name and URI
    input.push({ ...input[0], creator: "https://example.com Test" })
    output.push({ ...output[0], creator: [{ uri: "https://example.com", prefLabel: { en: "Test" } }] })
    let result
    transform.push = x => {
      result = x
    }
    input.forEach((row, index) => {
      transform._transform(row, undefined, () => {
        assert.deepEqual(result, output[index])
      })
    })

    done()
  })
})
