import { Transform } from "stream"
import { conceptFromNotation } from "./util.js"

const typeNames = {
  "": "http://www.w3.org/2004/02/skos/core#mappingRelation",
  "=": "http://www.w3.org/2004/02/skos/core#exactMatch",
  "≈": "http://www.w3.org/2004/02/skos/core#closeMatch",
  ">": "http://www.w3.org/2004/02/skos/core#broadMatch",
  "<": "http://www.w3.org/2004/02/skos/core#narrowMatch",
  "~": "http://www.w3.org/2004/02/skos/core#relatedMatch",
  exact: "http://www.w3.org/2004/02/skos/core#exactMatch",
  close: "http://www.w3.org/2004/02/skos/core#closeMatch",
  broad: "http://www.w3.org/2004/02/skos/core#broadMatch",
  narrow: "http://www.w3.org/2004/02/skos/core#narrowMatch",
  related: "http://www.w3.org/2004/02/skos/core#relatedMatch",
}

/**
 * Streaming CSV to JSKOS mapping transformer.
 *
 * Supports columns fromNotation, toNotation, type, created
 */
export default ({ fromScheme, toScheme, partOf, creator: creatorGlobal, created: createdGlobal }) => {
  if (!fromScheme || !toScheme) {
    throw new Error("Missing fromScheme and/or toScheme")
  }
  return new Transform({
    objectMode: true,
    transform(row, encoding, callback) {
      const { fromNotation, toNotation, type, creator: creatorRow, created: createdRow } = row

      const from = conceptFromNotation(fromScheme, fromNotation)
      const to = conceptFromNotation(toScheme, toNotation)
      const mappingType = typeNames[type || ""]
      if (!mappingType && !type) {
        console.error(`can't map mapping type "${type}"`)
      }

      const creator = creatorRow || creatorGlobal
      const created = createdRow || createdGlobal // TODO: check syntax

      const [, uri, name] = creator && creator.match(/(https?:\/\/[^ ]+)?\s*(.*)/) || [null, null, creator]
      let mappingCreator
      if (uri || name) {
        mappingCreator = {}
        if (uri) {
          mappingCreator.uri = uri
        }
        if (name) {
          mappingCreator.prefLabel = { en: name }
        }
      }

      if (from && to) {
        const mapping = {
          from: { memberSet: [ from ] },
          to: { memberSet: [ to ] },
          type: [ mappingType || typeNames[""] ],
        };
        // Convert member's "inScheme" to fromScheme/toScheme
        ["from", "to"].forEach(side => {
          if (mapping[side].memberSet[0].inScheme && mapping[side].memberSet[0].inScheme[0]) {
            mapping[`${side}Scheme`] = mapping[side].memberSet[0].inScheme[0]
            delete mapping[side].memberSet[0].inScheme
          }
        })
        if (partOf) {
          mapping.partOf = [ { uri: partOf } ]
        }
        if (mappingCreator) {
          mapping.creator = [mappingCreator]
        }
        if (created) {
          mapping.created = created
        }
        this.push(mapping)
      }

      callback()
    },
  })
}
