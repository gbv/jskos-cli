const assert = require("assert")
const { execFile } = require("child_process")
const { resolve } = require("path")
const file = (name) => resolve(__dirname, "../", name)

function jskosValidate(args, callback) {
  execFile(file("bin/jskos-validate"), args, callback)
}

describe("jskos-validate", () => {

  it("should print usage by default", (done) => {
    jskosValidate([], (error, stdout, stderr) => {
      assert.equal(stdout.substr(0,21), "Usage: jskos-validate")
      assert.equal(stderr, "")
      done()
    })
  })

  it("should check valid item", (done) => {
    let input = file("test/valid-item.ndjson")
    jskosValidate([input], (error, stdout, stderr) => {
      assert.equal(stdout, "ok     1 - "+input+"\n")
      assert.equal(stderr, "")
      done()
    })
  })

  it("should detect invalid item", (done) => {
    let input = file("test/invalid-item.ndjson")
    jskosValidate([input], (error, stdout, stderr) => {
      assert.equal(error.code, 1)
      assert.equal(stdout, "not ok 1 - "+input+"\n")
      assert.equal(stderr, "")
      done()
    })
  })

})
