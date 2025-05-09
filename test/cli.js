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
    convert(["mapping", input], (error, stdout, stderr) => {
      let expect = JSON.parse(fs.readFileSync(input))
      let output = JSON.parse(""+stdout)
      assert.deepEqual(expect, output)
      assert.equal(stderr, "")
      done()
    })
  })

  // TODO: Maybe move to "convert-concepts.js" test file after it is fixed. Maybe deal with test files differently as well.
  for (const filename of [
    "test-concepts.csv",
    "test-concepts2.csv",
  ]) {
    it(`should convert concepts (${filename}) from csv to ndjson`, (done) => {
      const input = file(`test/${filename}`)
      const scheme = file("test/test-scheme.json")
      convert(["concepts", "-s", scheme, "-t", "ndjson", "-m", input], (error, stdout, stderr) => {
        const expected = fs.readFileSync(input.replace(".csv", ".ndjson")).toString().trim()
        const output = (""+stdout).trim()
        assert.strictEqual(expected, output)
        assert.equal(stderr, "")
        done()
      })
    })
  }

  it("should not convert when namespace for scheme is missing", (done) => {
    const input = file("test/test-concepts.csv")
    const scheme = file("test/test-scheme-fail.json")
    convert(["concepts", "-s", scheme, "-t", "ndjson", "-m", input], (error, stdout, stderr) => {
      assert.equal(error?.code, 1)
      // Make sure error messages mentions "namespace"
      assert.ok(stderr.includes("namespace"))
      done()
    })
  })

  it("should use registry file to look up scheme, if given", (done) => {
    const input = file("test/test-concepts.csv")
    const registry = file("test/test-registry.ndjson")
    convert(["concepts", "-r", registry, "-s", "http://example.com/", "-t", "ndjson", "-m", input], (error, stdout, stderr) => {
      const expected = fs.readFileSync(input.replace(".csv", ".ndjson")).toString().trim()
      const output = (""+stdout).trim()
      assert.strictEqual(expected, output)
      assert.equal(stderr, "")
      done()
    })
  })
  
})


const enrich = (args, callback) => {
  execFile(file("bin/jskos-enrich"), args, callback)
}


describe("jskos-enrich", () => {

  it("should enrich subject labels", (done) => {
    
    const inputFile = file("test/test-subjects-input.ndjson")
    const outputFile = file("test/test-subjects-output.ndjson")
    const expectedFile = file("test/test-subjects-expected.ndjson")

    // Remove previous output file if any
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile)
    }
   
    enrich(["-e", inputFile, outputFile], (error, stdout, stderr) => {
      assert.strictEqual(stderr, "")
      assert.strictEqual(error, null)

      // Read both output and expected files
      const expected = fs.readFileSync(expectedFile, "utf8").trim().split("\n")
      const output = fs.readFileSync(outputFile, "utf8").trim().split("\n")

      assert.strictEqual(output.length, expected.length)

      output.forEach((line, i) => {
        assert.deepStrictEqual(JSON.parse(line), JSON.parse(expected[i]))
      })

      // Delete outputFile in the test folder
      fs.unlinkSync(outputFile) 

      done()
    }) 
  }).timeout(10000)

})