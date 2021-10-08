const conceptFromNotation = (scheme, notation) => {
  const concept = scheme.conceptFromNotation(notation, { inScheme: true })
  if (concept) {
    return concept
  } else if (scheme.uriPattern || scheme.namespace) {
    console.error(`invalid notation: "${notation}"`)
  } else {
    console.error(`can't map notation "${notation}" to URI`)
  }
}

module.exports = { conceptFromNotation }
