import { Transform } from "stream"
import { flattenMapping, addMappingIdentifiers } from "jskos-tools"

/**
 * Streaming JSKOS Mapping to CSV row converter.
 */
export default ({ language, identifier = false }) => new Transform({
  objectMode: true,
  async transform(mapping, encoding, callback) {
    // TODO: parse notation from URI if not given explicitly, requires knowledge about schemes
    try {
      if (identifier) {
        mapping = await addMappingIdentifiers(mapping)
      }
      const row = { ...flattenMapping(mapping, { language }) }
      if (identifier) {
        row.uri = mapping.uri ?? ""
        row.identifier = (mapping.identifier ?? []).join("|")
      }
      this.push(row)
      callback()
    } catch(e) {
      callback(e)
    }
  },
})
