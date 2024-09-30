import { Transform } from "stream"
import { flattenMapping } from "jskos-tools"

/**
 * Streaming JSKOS Mapping to CSV row converter.
 */
export default ({ language }) => new Transform({
  objectMode: true,
  transform(mapping, encoding, callback) {
    // TODO: parse notation from URI if not given explicitly, requires knowledge about schemes
    this.push(flattenMapping(mapping, { language }))
    callback()
  },
})
