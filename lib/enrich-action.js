// enrich-action.js

import readline from "readline"
import fs from "fs"
import fetch from "node-fetch"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"


/**
 * Fetches a JSKOS concept from a given URI using the CoLi-Conc API.
 * @param {string} uri - The URI of the concept.
 * @returns {Promise<Object|null>} - The JSKOS concept object, or null if not found or on error.
 */
async function fetchConcept(uri) {
  const baseUrl = "https://coli-conc.gbv.de/api/concepts"
  const params = new URLSearchParams({ uri })

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    })

    if (!response.ok) {
      console.warn(`Failed to fetch concept: ${response.status} ${response.statusText} for URI: ${uri}`)
      return null
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`No concept found for URI: ${uri}`)
      return null
    }

    return data[0] // CoLi-Conc returns an array
  } catch (error) {
    console.error(`Error fetching concept for URI ${uri}:`, error)
    return null
  }
}


/**
 * Enrich a single JSKOS object by adding prefLabels to subject URIs.
 * @param {Object} item - A JSKOS object.
 * @param {Object} [options] - Enrichment options.
 * @param {string[]} [options.languages=["en"]] - Languages to include.
 * @returns {Promise<Object>} - The enriched JSKOS object.
 */
async function enrichSubjectLabels(item) {
  if (!Array.isArray(item.subject)) {
    return item
  }

  for (const concept of item.subject) {
    if (!concept.uri || typeof concept.uri !== "string") {
      continue
    }

    const fetched = await fetchConcept(concept.uri)
    if (!fetched || typeof fetched.prefLabel !== "object") {
      continue
    }
    const fetchedPrefLabel = fetched.prefLabel
    concept.prefLabel = fetchedPrefLabel

  }

  return item
}

/**
 * Process NDJSON input from stdin or file, enrich and output each line.
 * @param {Object} options - Enrichment options.
 * @param {string} type - JSKOS type (unused for now).
 * @param {string[]} files - Input file paths, or "-" for stdin.
 */
export default async function enrich(options = {}) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const inputFile = options.inputFile
  const outputFile = options.outputFile
  const inputFilepath = resolve(__dirname, inputFile)
  const outputFilepath = resolve(__dirname, outputFile)
  const inputFileStream = inputFile === "-" ? process.stdin : fs.createReadStream(inputFilepath)
  const rl = readline.createInterface({ input: inputFileStream, crlfDelay: Infinity })
  const outputFileStream = outputFile === "-" ? process.stdin : fs.createWriteStream(outputFilepath)
  
  for await (const line of rl) {
    if (!line.trim()) {
      continue
    }

    let obj
    try {
      obj = JSON.parse(line)
    } catch {
      console.error(`# Invalid JSON: ${line}`)
      continue
    }
    
    // Enrich the input
    const enriched = await enrichSubjectLabels(obj, options)
    outputFileStream.write(JSON.stringify(enriched) + "\n")
    
  }

  outputFileStream.end()
  console.log(`✅ Enrichment complete: written to ${outputFilepath}`)

}
