import readline from "readline"
import fs from "fs"
import { cdk, addAllProviders } from "cocoda-sdk"
import { ConceptScheme } from "jskos-tools"
import { readJSONFile } from "./util.js"

/**
 * Match a concept URI to a config scheme
 * @param {string} uri 
 * @param {Array} schemes 
 * @returns {Object|null}
 */
function findMatchingScheme(uri, schemes) {
  for (const scheme of schemes) {
 
    if (scheme.URI_REGEX && scheme.URI_REGEX.test(uri)) {
      return scheme
    }
  }
  return null
}

/**
 * Match a scheme to a provider
 * @param {Object} scheme 
 * @param {Array} registries 
 * @returns {Object|null}
 */
function findProviderForScheme(scheme, registries) {
  if (!scheme || !scheme.API || !scheme.API.length) {
    return null
  }

  return registries.find(provider => 
    provider._jskos.schemes[0].uri === scheme.uri,
  )
}

/**
 * Full resolver: get provider for concept URI
 * @param {string} uri 
 * @param {Array} schemes 
 * @param {Array} registries 
 * @returns {Object|null}
 */
function getProviderForConceptURI(uri, schemes, registries) {
  const scheme = findMatchingScheme(uri, schemes)
  
  if (!scheme) {
    console.warn(`No matching scheme found for ${uri}`)
    return null
  }
  const registry = findProviderForScheme(scheme, registries)
  if (!registry) {
    console.warn(`No provider found for scheme ${scheme.uri}`)
  }
  return registry
}

async function fetchConceptLabels(uri, schemes, registries, options = {}) {
  const selectedRegistry = getProviderForConceptURI(uri, schemes, registries)
  if (!selectedRegistry) {
    return {}
  }

  try {
    const inScheme = selectedRegistry._jskos?.schemes[0]?.VOCID
      ? [{ VOCID: selectedRegistry._jskos.schemes[0].VOCID }]
      : undefined

    const concepts = await selectedRegistry.getConcepts({ concepts: [{ uri, inScheme }], params: {} }) 
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

export async function enrichSubjectLabels(item, schemes, registries, options = {}) {
  if (!Array.isArray(item.subject)) {
    return item
  }

  for (const concept of item.subject) {
    if (typeof concept.uri !== "string") {
      continue
    }

    // Fetch all available labels
    const labels = await fetchConceptLabels(concept.uri, schemes, registries, options)
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
  // Load configs dynamically
  const configs = await readJSONFile(options.schemes, import.meta.url)

  addAllProviders()
  const registries = await Promise.all(
    configs.map(c => cdk.registryForScheme(c)),
  )

  const conceptSchemes = configs.map(s => new ConceptScheme(s))


  const input = (files[0] || "-") === "-" ? process.stdin : fs.createReadStream(files[0])
  const output = (files[1] || "-") === "-" ? process.stdout : fs.createWriteStream(files[1])

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
  })

  let count = 0
  for await (const line of rl) {
  
    if (!line.trim()) {
      continue
    }
    
    try {
      const jskos = JSON.parse(line)
      const enriched = await enrichSubjectLabels(jskos, conceptSchemes, registries, options)
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
