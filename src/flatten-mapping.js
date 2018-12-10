const { mappingTypeByUri } = require("jskos-tools")

const getNested = (object, path) => {
  return path.split(".").reduce(
    (xs, x) => (xs && xs[x]) ? xs[x] : null, object)
}

module.exports = (mapping, options = {}) => {
  const { language } = options

  let fromNotation = getNested(mapping, "from.memberSet.0.notation.0")
  let toNotation = getNested(mapping, "to.memberSet.0.notation.0")
  fromNotation = fromNotation !== null ? fromNotation : ""
  toNotation = toNotation !== null ? toNotation : ""
  let type = mappingTypeByUri(getNested(mapping, "type.0"))
  type = type.short || ""

  let fromLabel = ""
  let toLabel = ""
  if (language) {
    fromLabel = getNested(mapping, `from.memberSet.0.prefLabel.${language}`)
    toLabel = getNested(mapping, `to.memberSet.0.prefLabel.${language}`)
  }
  
  return {fromNotation, toNotation, fromLabel, toLabel, type}
}
