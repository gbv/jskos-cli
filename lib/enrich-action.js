// enrich-action.js

import readline from "readline"
import fs from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { cdk, ConceptApiProvider, SkosmosApiProvider } from "cocoda-sdk"

cdk.addProvider(ConceptApiProvider)
const registryDDC = cdk.initializeRegistry({
  uri: "https://coli-conc.gbv.de/api/",
  provider: "ConceptApi",
  status: "https://coli-conc.gbv.de/api/status",
})

cdk.addProvider(SkosmosApiProvider)
const registryEuroVoc = cdk.initializeRegistry({
  uri: "http://bartoc.org/en/node/15",
  provider: "SkosmosApi",
  api: "https://skosmos.bartoc.org/rest/v1/",
})

const registryILC = cdk.initializeRegistry({
  uri: "http://bartoc.org/en/node/472",
  provider: "SkosmosApi",
  api: "https://skosmos.bartoc.org/rest/v1/",
})

const ILCVOCID = "472"
const EUROVOCVOCID = "15"

/**
 * Detects which vocabulary a subject URI belongs to.
 * @param {string} uri – The URI of the concept.
 * @returns {'ddc'|'eurovoc'|'ilc'|'unknown'} The detected vocabulary.
 */
function detectVocabulary(uri) {
  if (typeof uri !== "string") {
    return "unknown"
  }

  // DDC (Dewey Decimal Classification)
  // es.: http://dewey.info/class/328/e23/
  if (/^https?:\/\/(www\.)?dewey\.info\/class\/\d+\/e23\/?$/.test(uri)) {
    return "DDC"
  }

  // EuroVoc
  // es.: http://eurovoc.europa.eu/2492
  if (/^https?:\/\/(www\.)?eurovoc\.europa\.eu\/\d+\/?$/.test(uri)) {
    return "EUROVOC"
  }

  // ILC (ISKO ILC)
  // es.: http://www.iskoi.org/ilc/2/class/tah
  if (/^https?:\/\/(www\.)?iskoi\.org\/ilc\/\d+\/class\/[A-Za-z0-9-]+\/?$/.test(uri)) {
    return "ILC"
  }

  return "unknown"
}


async function fetchConceptLabels(uri) {
  const whichVoc = detectVocabulary(uri)

  const registryMap = {
    DDC: { registry: registryDDC, options: { concepts: [{ uri }], params: {} } },
    EUROVOC: { registry: registryEuroVoc, options: { concepts: [{ uri, inScheme: [{ VOCID: EUROVOCVOCID }] }], params: {} } },
    ILC: { registry: registryILC, options: { concepts: [{ uri, inScheme: [{ VOCID: ILCVOCID }] }], params: {} } },
  }

  const entry = registryMap[whichVoc]
  if (!entry) {
    return {}
  }

  try {
    const concept = await entry.registry.getConcepts(entry.options)
    return concept[0]?.prefLabel ?? {}
  } catch (err) {
    console.error(`Failed to fetch concept ${uri}:`, err)
    return {}
  }
}

export async function enrichSubjectLabels(item) {
  if (!Array.isArray(item.subject)) {
    return item
  }

  for (const concept of item.subject) {
    if (typeof concept.uri !== "string") {
      continue
    }

    // Fetch all available labels
    const labels = await fetchConceptLabels(concept.uri)
    if (Object.keys(labels).length) {
      concept.prefLabel = labels
    }
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
