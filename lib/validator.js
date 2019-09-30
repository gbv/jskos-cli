const { Transform } = require("stream")
const validate = require("jskos-validate")

module.exports = ({ type }) => new Transform({
  objectMode: true,
  transform(object, encoding, callback) {
    if (validate[type](object)) {
      this.push(object)
    } else {
      console.error(`invalid ${type}: ${JSON.stringify(object)}`)
    }
    callback()
  }
})
