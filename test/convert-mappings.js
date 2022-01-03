const assert = require("assert")
const { ConceptScheme } = require("jskos-tools")
const mappingsFromRows = require("../lib/csv-to-mapping")

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
        from: { memberSet: [{
          inScheme: [ { uri: "http://example.org/voc" } ],
          notation: [ "A1" ],
          uri: "http://example.org/voc/A1",
        }] },
        to: { memberSet: [{
          inScheme: [ { uri: "http://example.com/voc" } ],
          notation: [ "x" ],
          uri: "http://example.com/voc/x",
        }] },
        type: [ "http://www.w3.org/2004/02/skos/core#mappingRelation" ],
      },
      {
        from: { memberSet: [{
          inScheme: [ { uri: "http://example.org/voc" } ],
          notation: [ "X2" ],
          uri: "http://example.org/voc/X2",
        }] },
        to: { memberSet: [{
          inScheme: [ { uri: "http://example.com/voc" } ],
          notation: [ "y" ],
          uri: "http://example.com/voc/y",
        }] },
        type: [ "http://www.w3.org/2004/02/skos/core#exactMatch" ],
      },
    ]
    var result
    transform.push = x => { result = x }
    input.forEach((row, index) => { 
      transform._transform(row, undefined, () => {
        assert.deepEqual(result, output[index])
      })
    })

    done()
  })
})


