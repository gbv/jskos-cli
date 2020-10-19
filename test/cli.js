const assert = require("assert")
const fs = require("fs")
const { execFile } = require("child_process")
const { resolve } = require("path")
const file = (name) => resolve(__dirname, "../", name)

const validate = (args, callback) => {
  execFile(file("bin/jskos-validate"), args, callback)
}

describe("jskos-validate", () => {

  it("should print usage by default", (done) => {
    validate([], (error, stdout, stderr) => {
      assert.equal(stdout.substr(0,21), "Usage: jskos-validate")
      assert.equal(stderr, "")
      done()
    })
  })

  it("should check valid item", (done) => {
    let input = file("test/valid-item.ndjson")
    validate(["-v", input], (error, stdout, stderr) => {
      assert.equal(stdout, "ok     1 - "+input+"\n")
      assert.equal(stderr, "")
      done()
    })
  })

  it("should detect invalid item", (done) => {
    let input = file("test/invalid-item.ndjson")
    validate([input], (error, stdout, stderr) => {
      assert.equal(error.code, 1)
      assert.equal(stdout, "not ok 1 - "+input+"\n")
      assert.equal(stderr, "# invalid item 1\n")
      done()
    })
  })

})

const convert = (args, callback) => {
  execFile(file("bin/jskos-convert"), args, callback)
}

describe("jskos-convert", () => {

  it("should return ndjson by default", (done) => {
    let input = file("test/valid-mapping.ndjson")
    convert([input], (error, stdout, stderr) => {
      let expect = JSON.parse(fs.readFileSync(input))
      let output = JSON.parse(""+stdout)
      assert.deepEqual(expect, output)
      assert.equal(stderr, "")
      done()
    })
  })

})
