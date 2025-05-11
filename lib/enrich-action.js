import readline from "readline"
import fs from "fs"
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


async function fetchConceptLabels(uri, options = {}) {
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
    const concepts = await entry.registry.getConcepts(entry.options)
    const concept = Array.isArray(concepts) ? concepts[0] : null

    if (concept && concept.prefLabel && typeof concept.prefLabel === "object") {
      return concept.prefLabel
    }
  } catch (err) {
    if (!options.quiet) {
      console.error(`❌  Error fetching ${uri} with error ${err}`)
    }
  }

  return {}
}

export async function enrichSubjectLabels(item, options = {}) {
  if (!Array.isArray(item.subject)) {
    return item
  }

  for (const concept of item.subject) {
    if (typeof concept.uri !== "string") {
      continue
    }

    // Fetch all available labels
    const labels = await fetchConceptLabels(concept.uri, options)
    if (Object.keys(labels).length) {
      concept.prefLabel = labels
    } else if (!options.quiet) {
      console.warn(`⚠️  Skipped enrichment for ${concept.uri}`)
    }
  }

  return item
}

/**
 * Process NDJSON input from stdin or file, enrich and output each line.
 * @param {Object} options - Enrichment options.
 * @param {string[]} files - Input and output file, or "-" for stdin/stdout.
 */
export default async function enrich(files, options = {}) {
  const input = (files[0] || "-") === "-" ? process.stdin : fs.createReadStream(files[0])
  const output = (files[1] || "-") === "-" ? process.stdout : fs.createWriteStream(files[1])
  
  const rl = readline.createInterface({ input, crlfDelay: Infinity })

  let count = 0
  for await (const line of rl) {
    if (!line.trim()) {
      continue
    }

    try {
      const jskos = JSON.parse(line)
      const enriched = await enrichSubjectLabels(jskos, options)
      output.write(JSON.stringify(enriched) + "\n")

      if (!options.quiet && output !== process.stdout) {
        if (++count % 100 === 0) {
          console.log(`Processed ${count} lines...`)
        }
      }
    } catch {
      console.error(`# Invalid JSON: ${line}`)
    }
  }

  output.end()
}
