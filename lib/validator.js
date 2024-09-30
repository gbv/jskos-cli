import { Transform } from "stream"
import { validate } from "jskos-validate"

/**
 * Streaming JSKOS validator.
 */
export default ({ type }) => new Transform({
  objectMode: true,
  transform(object, encoding, callback) {
    if (validate[type](object)) {
      this.push(object)
    } else {
      console.error(`invalid ${type}: ${JSON.stringify(object)}`)
    }
    callback()
  },
})
