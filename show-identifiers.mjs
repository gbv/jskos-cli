#!/usr/bin/env node
// Temporary script to visualize mapping sameness identifiers.
// Usage: node show-identifiers.mjs [ndjson-file]
// If no file is given, reads from stdin.

import readline from "readline"
import fs from "fs"

const file = process.argv[2]
const input = file ? fs.createReadStream(file) : process.stdin

const rl = readline.createInterface({ input, crlfDelay: Infinity })

let count = 0
for await (const line of rl) {
  if (!line.trim()) continue
  const mapping = JSON.parse(line)
  count++

  const from = mapping.from?.memberSet?.map(c => c.uri || c.notation?.[0]).join(", ") ?? "?"
  const to   = mapping.to?.memberSet?.map(c => c.uri || c.notation?.[0]).join(", ") ?? "?"
  const type = (mapping.type?.[0] ?? "").replace(/.*[/#]/, "")

  const ids = mapping.identifier ?? []
  const sameness = ids.find(id => id.startsWith("mapping:"))
  const members  = ids.find(id => id.startsWith("urn:jskos:mapping:members:"))
  const content  = ids.find(id => id.startsWith("urn:jskos:mapping:content:"))

  console.log(`\nMapping #${count}: ${from}  →[${type}]→  ${to}`)
  console.log(`  sameness : ${sameness ?? "(missing)"}`)
  console.log(`  members  : ${members  ?? "(missing)"}`)
  console.log(`  content  : ${content  ?? "(missing)"}`)
}

console.log(`\nTotal: ${count} mapping(s)`)
