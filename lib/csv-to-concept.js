import { Transform } from "stream"
import { conceptFromNotation } from "./util.js"

const empty = s => !s && `${s}` !== "0"

/**
 * Streaming CSV to JSKOS concept transformer.
 *
 * TODO: support hiddenLabel, definition, example, historyNote, editorialNote, changeNote, note
 */
export default ({ language, scheme, marktop }) => {
  language = language || "en"

  const stack = []

  return new Transform({
    objectMode: true,
    transform(row, encoding, callback) {

      // prefLabel
      const prefLabels = {}
      if (!empty(row.prefLabel)) {
        prefLabels[language] = row.prefLabel
      }
      Object.keys(row)
        .filter(key => /^prefLabel[@_](.+)$/.test(key))
        .filter(key => !empty(row[key]))
        .forEach(key => {
          prefLabels[key.substr(10)] = row[key]
        })

      // scopeNote
      const scopeNotes = {}
      if (!empty(row.scopeNote)) {
        scopeNotes[language] = [ row.scopeNote ]
      }
      Object.keys(row)
        .filter(key => /^scopeNote[@_](.+)$/.test(key))
        .filter(key => !empty(row[key]))
        .forEach(key => {
          scopeNotes[key.substr(11)] = [ row[key] ]
        })

      // altLabel
      const altLabels = {}
      if (!empty(row.altLabel)) {
        altLabels[language] = [ row.altLabel ]
      }
      Object.keys(row)
        .filter(key => /^altLabel[@_](.+)$/.test(key))
        .filter(key => !empty(row[key]))
        .forEach(key => {
          altLabels[key.substr(9)] = [ row[key] ]
        })

      const { notation } = row
      const concept = conceptFromNotation(scheme, notation)
      if (concept) {
        if (Object.keys(prefLabels).length) {
          concept.prefLabel = prefLabels
        }
        if (Object.keys(scopeNotes).length) {
          concept.scopeNote = scopeNotes
        }
        if (Object.keys(altLabels).length) {
          concept.altLabel = altLabels
        }

        let { broaderNotation, parent } = row
        if (parent && !broaderNotation) {
          broaderNotation = parent
        }
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
            while (level < stack.length - 1) {
              stack.pop()
            }
            // TODO: broaderNotation
          }

          stack[level] = notation
          if (level > 0) {
            broaderNotation = stack[level - 1]
          } else {
            concept.topConceptOf = [{uri:scheme.uri}]
          }
        }

        if (broaderNotation) {
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
      }

      callback()
    },
  })
}
