import { Transform } from "stream"

function flattenConcept(concept, { scheme, language } ) {
  const { prefLabel, scopeNote, broader } = concept
  const flat = {
    notation: concept.notation[0],
  }
  if (language) {
    if (language in (prefLabel || {})) {
      flat.prefLabel = prefLabel[language]
    }
    if (language in (scopeNote || {}) && scopeNote[language].length) {
      flat.scopeNote = scopeNote[language][0]
    }
  }
  if (scheme && broader && broader.length) {
    const notation = scheme.notationFromUri(broader[0].uri)
    if (notation !== undefined) {
      flat.broaderNotation = notation
    }
  }
  return flat
}

export default (options) => new Transform({
  objectMode: true,
  transform(concept, encoding, callback) {
    this.push(flattenConcept(concept, options))
    callback()
  },
})
