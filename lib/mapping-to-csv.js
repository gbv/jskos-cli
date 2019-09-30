const { Transform } = require("stream")
const { flattenMapping } = require("jskos-tools")

/**
 * Streaming JSKOS Mapping to CSV row converter.
 */
module.exports = ({ language }) => new Transform({
  objectMode: true,
  transform(mapping, encoding, callback) {
    // TODO: parse notation from URI if not given explicitly, requires knowledge about schemes
    this.push(flattenMapping(mapping, { language }))
    callback()
  }
})
