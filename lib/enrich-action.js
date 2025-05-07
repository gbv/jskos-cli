// enrich-action.js

import readline from "readline"
import fs from "fs"
import fetch from "node-fetch"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

/**
 * Fetch prefLabel(s) for a given EuroVoc concept URI.
 * @param {string} uri - The URI of the EuroVoc concept.
 * @returns {Promise<Object|null>} - An object with labels by language, e.g. { en: "..." }, or null if not found.
 */
export async function fetchEurovocLabel(uri) {
  const endpoint = "https://data.europa.eu/sparql"
  const query = `
    SELECT DISTINCT ?lang ?label WHERE {
      <${uri}> <http://www.w3.org/2004/02/skos/core#prefLabel> ?label .
      BIND(lang(?label) AS ?lang)
    }
  `
  const url = `${endpoint}?query=${encodeURIComponent(query)}&format=application%2Fsparql-results%2Bjson`

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/sparql-results+json",
      },
    })

    if (!response.ok) {
      console.warn(`Failed to fetch label from EuroVoc: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    const subject = {prefLabel: {}}
    for (const binding of data.results.bindings) {
      subject.prefLabel[binding.lang.value] = binding.label.value
    }
    
    return Object.keys(subject.prefLabel).length ? subject : null
  } catch (error) {
    console.error(`Error fetching EuroVoc label for ${uri}:`, error)
    return null
  }
}


/**
 * Fetches a JSKOS concept from a given URI using the CoLi-Conc API.
 * @param {string} uri - The URI of the concept.
 * @returns {Promise<Object|null>} - The JSKOS concept object, or null if not found or on error.
 */
async function fetchDdcConcept(uri) {
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


function detectVocabulary(uri) {
  if (/^https?:\/\/dewey\.info\/class\/\d+\/e23\/?$/.test(uri)) {
    return "DDC"
  } else if (/^https?:\/\/eurovoc\.europa\.eu\/\d+\/?$/.test(uri)) {
    return "EuroVoc"
  } else {
    return "ILC"
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

    // We check the uri in oder to see to which it belongs, DDC either eurovoc 
    // and for the moment skip ilc

    let whichVoc = detectVocabulary(concept.uri)

    let subjectLabelsfetched

    switch (whichVoc) {
      case "EuroVoc":
        subjectLabelsfetched = await fetchEurovocLabel(concept.uri) // EuroVoc case
        break
      case "ILC":
        continue
      default:
        subjectLabelsfetched = await fetchDdcConcept(concept.uri) // DDC case
        break
    }

    if (!subjectLabelsfetched || typeof subjectLabelsfetched.prefLabel !== "object") {
      continue
    }
    concept.prefLabel = subjectLabelsfetched.prefLabel

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
  
  let count = 0
  for await (const line of rl) {
    if (!line.trim()) {
      continue
    }

    let jskosRecord
    try {
      jskosRecord = JSON.parse(line)
    } catch {
      console.error(`# Invalid JSON: ${line}`)
      continue
    }
    
    // Enrich the input
    const enriched = await enrichSubjectLabels(jskosRecord, options)
    outputFileStream.write(JSON.stringify(enriched) + "\n")

    count++
    if (count % 100 === 0) {
      console.log(`Processed ${count} lines...`)
    }
    
  }

  outputFileStream.end()
  console.log(`✅ Enrichment complete: written to ${outputFilepath}`)

}
