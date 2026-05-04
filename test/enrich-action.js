import assert from "assert"
import { enrichLabels } from "../lib/enrich-action.js"

const scheme = {
  uri: "http://example.com/scheme",
  API: [{}],
  URI_REGEX: /^http:\/\/example\.com\/concept\//,
}

const options = {
  properties: ["subject"],
  quiet: true,
}

function fakeRegistry(resolveConcept) {
  return {
    _jskos: {
      schemes: [
        {
          uri: scheme.uri,
        },
      ],
    },
    getConcepts: async ({ concepts }) => concepts.map(concept => resolveConcept(concept.uri)),
  }
}

describe("enrichLabels", () => {

  it("should enrich missing prefLabel and notation", async () => {
    const item = {
      subject: [
        {
          uri: "http://example.com/concept/A",
        },
      ],
    }
    const registry = fakeRegistry(() => ({
      prefLabel: {
        en: "Alpha",
      },
      notation: ["A"],
    }))

    const enriched = await enrichLabels(item, [scheme], [registry], options)

    assert.deepStrictEqual(enriched.subject[0], {
      uri: "http://example.com/concept/A",
      prefLabel: {
        en: "Alpha",
      },
      notation: ["A"],
    })
  })

  it("should enrich missing notation when prefLabel already exists", async () => {
    const item = {
      subject: [
        {
          uri: "http://example.com/concept/A",
          prefLabel: {
            en: "Existing label",
          },
        },
      ],
    }
    const registry = fakeRegistry(() => ({
      prefLabel: {
        en: "Registry label",
      },
      notation: ["A"],
    }))

    const enriched = await enrichLabels(item, [scheme], [registry], options)

    assert.deepStrictEqual(enriched.subject[0], {
      uri: "http://example.com/concept/A",
      prefLabel: {
        en: "Existing label",
      },
      notation: ["A"],
    })
  })

  it("should enrich missing prefLabel when notation already exists", async () => {
    const item = {
      subject: [
        {
          uri: "http://example.com/concept/A",
          notation: ["A"],
        },
      ],
    }
    const registry = fakeRegistry(() => ({
      prefLabel: {
        en: "Alpha",
      },
      notation: ["Registry A"],
    }))

    const enriched = await enrichLabels(item, [scheme], [registry], options)

    assert.deepStrictEqual(enriched.subject[0], {
      uri: "http://example.com/concept/A",
      prefLabel: {
        en: "Alpha",
      },
      notation: ["A"],
    })
  })

  it("should not fetch concepts already enriched with prefLabel and notation", async () => {
    let calls = 0
    const item = {
      subject: [
        {
          uri: "http://example.com/concept/A",
          prefLabel: {
            en: "Alpha",
          },
          notation: ["A"],
        },
      ],
    }
    const registry = fakeRegistry(() => {
      calls += 1
      return {}
    })

    const enriched = await enrichLabels(item, [scheme], [registry], options)

    assert.strictEqual(calls, 0)
    assert.deepStrictEqual(enriched, item)
  })

  it("should not fetch missing notation for labelled items outside configured schemes", async () => {
    let calls = 0
    const item = {
      subject: [
        {
          uri: "http://example.org/person/1",
          prefLabel: {
            en: "Existing label",
          },
        },
      ],
    }
    const registry = fakeRegistry(() => {
      calls += 1
      return {
        notation: ["1"],
      }
    })

    const enriched = await enrichLabels(item, [scheme], [registry], options)

    assert.strictEqual(calls, 0)
    assert.deepStrictEqual(enriched, item)
  })

  it("should fetch only matching scheme identifiers when only notation is missing", async () => {
    const fetched = []
    const item = {
      subject: [
        {
          uri: "http://example.com/concept/A",
          identifier: ["http://example.org/external/A"],
          prefLabel: {
            en: "Alpha",
          },
        },
      ],
    }
    const registry = fakeRegistry(uri => {
      fetched.push(uri)
      return {
        notation: ["A"],
      }
    })

    const enriched = await enrichLabels(item, [scheme], [registry], options)

    assert.deepStrictEqual(fetched, ["http://example.com/concept/A"])
    assert.deepStrictEqual(enriched.subject[0], {
      uri: "http://example.com/concept/A",
      identifier: ["http://example.org/external/A"],
      prefLabel: {
        en: "Alpha",
      },
      notation: ["A"],
    })
  })

})
