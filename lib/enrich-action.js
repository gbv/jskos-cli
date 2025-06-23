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
function getProviderForConceptURI(uri, schemes, registries, options = {}) {
  const scheme = findMatchingScheme(uri, schemes)
  
  if (!scheme && !options.quiet) {
    console.warn(`No matching scheme found for ${uri}`)
    return null
  }
  const registry = findProviderForScheme(scheme, registries)
  if (!registry && !options.quiet) {
    console.warn(`No provider found for scheme ${scheme.uri}`)
  }
  return registry
}

async function fetchConceptLabels(uri, schemes, registries, options = {}) {
  const selectedRegistry = getProviderForConceptURI(uri, schemes, registries, options)
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


/**
 * Enrich Jskos record based on properties passed as argument
 * @param {Object} item - Jskos record
 * @param {ConceptScheme[]} schemes - available schemes
 * @param {string[]} registries - available registries
 * @param {Object} options - Enrichment options, it containes which properties.
 */
export async function enrichLabels(item, schemes, registries, options = {}) {
  // 1. Guard: no properties → no enrichment
  if (!Array.isArray(options.properties) || options.properties.length === 0) {
    return item
  }

  const props = options.properties
  const idSet = new Set()

  // 2. Scan once to collect all identifiers needing enrichment
  for (const prop of props) {
    const propertyItems = item[prop]
    if (!Array.isArray(propertyItems)) {
      continue
    }


    for (const propertyItem of propertyItems) {
      // skip if already has prefLabel
      if (propertyItem.prefLabel && typeof propertyItem.prefLabel === "object") {
        continue
      }

      // pick only uri as indetifier
      /* const identifier = propertyItem.uri ?? ""
      if (typeof identifier === "string" && identifier.trim()) {
        idSet.add(identifier)
      } */

      const identifiers = [
        ...(Array.isArray(propertyItem.identifier) ? propertyItem.identifier : []),
        propertyItem.uri,
      ].filter(Boolean)

      for (const id of identifiers) {
        if (typeof id === "string" && id.trim()) {
          idSet.add(id)
        }
      }

    }
  }

  // 3. Fire off all fetches in parallel
  const ids = [...idSet]
  const fetchPromises = ids.map(id =>
    fetchConceptLabels(id, schemes, registries, options)
      .then(labels => [id, labels]),
  )

  const results = await Promise.all(fetchPromises)
  const labelsMap = new Map(results)  // id → labels object

  // 4. Assign results back onto the original item
  for (const prop of props) {
    const propertyItems = item[prop]
    // If the property does not exist on the actual ndjson data, is skipped
    if (!Array.isArray(propertyItems)) {
      continue
    }

    for (const propertyItem of propertyItems) {
      // skip if already enriched
      if (propertyItem.prefLabel && typeof propertyItem.prefLabel === "object") {
        continue
      }

      const identifiers = [
        ...(Array.isArray(propertyItem.identifier) ? propertyItem.identifier : []),
        propertyItem.uri,
      ].filter(Boolean)

      const match = identifiers.find(id => labelsMap.has(id))

      if (!match) {
        if (!options.quiet) {
          console.warn(`⚠️  Skipped enrichment for ${identifiers.join(", ")}`)
        }
        continue
      }

      const labels = labelsMap.get(match)
      if (Object.keys(labels).length > 0) {
        propertyItem.prefLabel = labels
      } else if (!options.quiet) {
        console.warn(`⚠️  No labels returned for ${match}`)
      }
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

  // Processing configuration schemes
  addAllProviders()
  const registries = await Promise.all(
    configs.map(c => cdk.registryForScheme(c)),
  )
  const conceptSchemes = configs.map(s => new ConceptScheme(s))

  // Processing input and output ndjson files 
  const input = (files[0] || "-") === "-" ? process.stdin : fs.createReadStream(files[0])
  const output = (files[1] || "-") === "-" ? process.stdout : fs.createWriteStream(files[1])
  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
  })

 
  // Start loop on each line of the related ndjson file
  let count = 0
  for await (const line of rl) {
  
    if (!line.trim()) {
      continue
    }
    
    try {
      const jskos = JSON.parse(line)
      const enriched = await enrichLabels(jskos, conceptSchemes, registries, options)
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
