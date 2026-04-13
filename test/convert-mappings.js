import assert from "assert"
import { ConceptScheme, addMappingIdentifiers } from "jskos-tools"
import mappingsFromRows from "../lib/csv-to-mapping.js"
import mappingsToRows from "../lib/mapping-to-csv.js"

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

  it("adds mapping sameness identifier", async () => {
    const mapping = {
      from: { memberSet: [{ uri: "http://example.org/voc/A1", notation: ["A1"] }] },
      fromScheme: { uri: "http://example.org/voc" },
      to: { memberSet: [{ uri: "http://example.com/voc/x", notation: ["x"] }] },
      toScheme: { uri: "http://example.com/voc" },
      type: ["http://www.w3.org/2004/02/skos/core#exactMatch"],
    }
    const result = await addMappingIdentifiers(mapping)
    assert.ok(Array.isArray(result.identifier))
    assert.ok(result.identifier.some(id => id.startsWith("mapping:")))
    assert.ok(result.identifier.some(id => id.startsWith("urn:jskos:mapping:members:")))
    assert.ok(result.identifier.some(id => id.startsWith("urn:jskos:mapping:content:")))
  })

  it("emits uri and identifier fields in CSV row when identifier option is set", async () => {
    const mapping = {
      uri: "http://example.org/mappings/1",
      from: { memberSet: [{ uri: "http://example.org/voc/A1", notation: ["A1"] }] },
      fromScheme: { uri: "http://example.org/voc" },
      to: { memberSet: [{ uri: "http://example.com/voc/x", notation: ["x"] }] },
      toScheme: { uri: "http://example.com/voc" },
      type: ["http://www.w3.org/2004/02/skos/core#exactMatch"],
    }

    const transform = mappingsToRows({ identifier: true })
    const row = await new Promise((resolve, reject) => {
      transform.push = resolve
      transform._transform(mapping, undefined, err => err && reject(err))
    })

    assert.strictEqual(row.uri, "http://example.org/mappings/1")
    assert.ok(typeof row.identifier === "string")
    assert.ok(row.identifier.split("|").some(id => id.startsWith("mapping:")))
    assert.ok(row.identifier.split("|").some(id => id.startsWith("urn:jskos:mapping:members:")))
    assert.ok(row.identifier.split("|").some(id => id.startsWith("urn:jskos:mapping:content:")))
    // existing flattenMapping fields must still be present
    assert.strictEqual(row.fromNotation, "A1")
  })

  it("replaces existing mapping sameness identifier", async () => {
    const mapping = {
      from: { memberSet: [{ uri: "http://example.org/voc/A1", notation: ["A1"] }] },
      fromScheme: { uri: "http://example.org/voc" },
      to: { memberSet: [{ uri: "http://example.com/voc/x", notation: ["x"] }] },
      toScheme: { uri: "http://example.com/voc" },
      type: ["http://www.w3.org/2004/02/skos/core#exactMatch"],
      identifier: ["mapping:oldid"],
    }
    const result = await addMappingIdentifiers(mapping)
    const samenessIds = result.identifier.filter(id => id.startsWith("mapping:"))
    assert.strictEqual(samenessIds.length, 1)
    assert.ok(!samenessIds[0].includes("oldid"))
  })
})
