const { Transform } = require("stream")

/**
 * Streaming CSV to JSKOS concept transformer.
 *
 * Supports columns notation, prefLabel, scopeNote, level, and broaderNotation.
 */
module.exports = ({ language, scheme, marktop }) => {
  language = language || "en"

  const stack = []

  return new Transform({
    objectMode: true,
    transform(row, encoding, callback) {
      const { notation, prefLabel, scopeNote } = row

      const concept = scheme.conceptFromNotation(notation, { inScheme: true })
      if (concept) {
        if (prefLabel) {
          concept.prefLabel = {[language]: prefLabel}
        }
        if (scopeNote) {
          concept.scopeNote = {[language]: [scopeNote]}
        }

        let { broaderNotation } = row
        let level = parseInt(row.level)
        if (level < 0) {
          console.error(`invalid level ${level} at ${notation}`)
          level = 0
        }

        if (!isNaN(level)) {
          if (!stack.length) { // first concept
            stack[level] = notation
          }

          if (level !== stack.length - 1) {
            // keep it
          } else if (level > stack.length - 1) {
            if (level !== stack.length) {
              console.error(`invalid level jump to ${level} at ${notation}`)
            }
            // deeper
          } else {
            while (level < stack.length - 1) stack.pop()
            // TODO: broaderNotation
          }

          stack[level] = notation
          if (level > 0) {
            broaderNotation = stack[level - 1]
          } else {
            concept.topConceptOf = [{uri:scheme.uri}]
          }
        }

        if (broaderNotation !== undefined) {
          let broader = scheme.conceptFromNotation(broaderNotation)
          if (broader) {
            concept.broader = [broader]
          } else {
            console.error(`invalid broader notation: "${broaderNotation}"`)
          }
        } else if (marktop) {
          concept.topConceptOf = [{uri: scheme.uri}]
        }

        this.push(concept)
      } else {
        if (!(scheme.uriPattern || scheme.namespace)) {
          console.error(`can't map notation "${notation}" to URI`)
        } else {
          console.error(`invalid notation: "${notation}"`)
        }
      }

      callback()
    },
  })
}


