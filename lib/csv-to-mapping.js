const { Transform } = require("stream")
const { conceptFromNotation } = require("./util")

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
 * Supports columns fromNotation, toNotation, type
 */
module.exports = ({ fromScheme, toScheme, partOf }) => {
  return new Transform({
    objectMode: true,
    transform(row, encoding, callback) {
      const { fromNotation, toNotation, type } = row

      const from = conceptFromNotation(fromScheme, fromNotation)
      const to = conceptFromNotation(toScheme, toNotation)        
      const mappingType = typeNames[type || ""]
      if (!mappingType && !type) {
        console.error(`can't map mapping type "${type}"`)
      }

      if (from && to) {
        const mapping = {
          from: { memberSet: [ from ] },
          to: { memberSet: [ to ] },
          type: [ mappingType || typeNames[""] ],
        }
        if (partOf) {
          mapping.partOf = [ { uri: partOf } ]
        }
        this.push(mapping)
      }

      callback()
    },
  })
} 
