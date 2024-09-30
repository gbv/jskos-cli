import assert from "assert"
import fs from "fs"
import { execFile } from "child_process"
import { resolve } from "path"
import { dirname } from "../lib/util.js"

const file = (name) => resolve(dirname(import.meta.url), "../", name)

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
    validate(["-v", "item", input], (error, stdout, stderr) => {
      assert.equal(stdout, "ok     1 - "+input+"\n")
      assert.equal(stderr, "")
      done()
    })
  })

  it("should detect invalid item", (done) => {
    let input = file("test/invalid-item.ndjson")
    validate(["item", input], (error, stdout, stderr) => {
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

  // TODO: Maybe move to "convert-concepts.js" test file after it is fixed. Maybe deal with test files differently as well.
  it("should convert concepts from csv to ndjson", (done) => {
    const input = file("test/test-concepts.csv")
    const scheme = file("test/test-scheme.json")
    convert(["concepts", "-s", scheme, "-t", "ndjson", "-m", input], (error, stdout, stderr) => {
      console.log(stdout)
      console.log(stderr)
      const expected = fs.readFileSync(input.replace(".csv", ".ndjson")).toString().trim()
      const output = (""+stdout).trim()
      assert.strictEqual(expected, output)
      assert.equal(stderr, "")
      done()
    })
  })

})
