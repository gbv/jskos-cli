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

function hasPrefLabel(concept) {
  return concept?.prefLabel
    && typeof concept.prefLabel === "object"
    && Object.keys(concept.prefLabel).length > 0
}

function hasNotation(concept) {
  return Array.isArray(concept?.notation) && concept.notation.length > 0
}

function hasEnrichmentData(concept) {
  return hasPrefLabel(concept) || hasNotation(concept)
}

// Use fetched data only if it fills a field that is still missing on this item.
function canEnrichItem(item, data) {
  return (!hasPrefLabel(item) && hasPrefLabel(data))
    || (!hasNotation(item) && hasNotation(data))
}

function hasMatchingSchemeIdentifier(identifiers, schemes) {
  return identifiers.some(id => typeof id === "string" && findMatchingScheme(id, schemes))
}

// If a label already exists, only try to add notation for configured schemes.
function shouldTryEnrichment(item, identifiers, schemes) {
  return !hasPrefLabel(item) || hasMatchingSchemeIdentifier(identifiers, schemes)
}

// For labelled items, fetch only identifiers that match a known scheme.
// For unlabelled items, keep the previous behavior and try all identifiers.
function shouldFetchIdentifier(id, item, schemes) {
  return typeof id === "string"
    && id.trim()
    && (!hasPrefLabel(item) || findMatchingScheme(id, schemes))
}

async function fetchConceptData(uri, schemes, registries, options = {}) {
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
    const enrichmentData = {}

    // Registries may return full JSKOS concepts; enrich copies only these fields.
    if (hasPrefLabel(concept)) {
      enrichmentData.prefLabel = concept.prefLabel
    }
    if (hasNotation(concept)) {
      enrichmentData.notation = concept.notation
    }
    if (hasEnrichmentData(enrichmentData)) {
      return enrichmentData
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

  // 2. Scan once to collect all identifiers needing enrichment.
  // Deduplicating here keeps repeated subject URIs to one lookup.
  for (const prop of props) {
    const propertyItems = item[prop]
    if (!Array.isArray(propertyItems)) {
      continue
    }


    for (const propertyItem of propertyItems) {
      // Use both uri and identifier because some records carry alternate lookup URIs.
      const identifiers = [
        ...(Array.isArray(propertyItem.identifier) ? propertyItem.identifier : []),
        propertyItem.uri,
      ].filter(Boolean)

      // Skip completed items, and do not fetch notation for unknown labelled resources.
      if (
        (hasPrefLabel(propertyItem) && hasNotation(propertyItem))
        || !shouldTryEnrichment(propertyItem, identifiers, schemes)
      ) {
        continue
      }

      for (const id of identifiers) {
        if (shouldFetchIdentifier(id, propertyItem, schemes)) {
          idSet.add(id)
        }
      }

    }
  }

  // 3. Fire off all fetches in parallel
  const ids = [...idSet]
  const fetchPromises = ids.map(id =>
    fetchConceptData(id, schemes, registries, options)
      .then(data => [id, data]),
  )

  const results = await Promise.all(fetchPromises)
  const dataMap = new Map(results)  // id -> concept data object

  // 4. Assign results back onto the original item without overwriting existing data.
  for (const prop of props) {
    const propertyItems = item[prop]
    // If the property does not exist on the actual ndjson data, is skipped
    if (!Array.isArray(propertyItems)) {
      continue
    }

    for (const propertyItem of propertyItems) {
      // Use the same identifier order as above so identifier matches can beat uri matches.
      const identifiers = [
        ...(Array.isArray(propertyItem.identifier) ? propertyItem.identifier : []),
        propertyItem.uri,
      ].filter(Boolean)

      // Skip completed items, and do not fetch notation for unknown labelled resources.
      if (
        (hasPrefLabel(propertyItem) && hasNotation(propertyItem))
        || !shouldTryEnrichment(propertyItem, identifiers, schemes)
      ) {
        continue
      }

      const match = identifiers
        .map(id => [id, dataMap.get(id)])
        .find(([, data]) => canEnrichItem(propertyItem, data))

      if (!match) {
        if (!options.quiet) {
          console.warn(`⚠️  Skipped enrichment for ${identifiers.join(", ")}`)
        }
        continue
      }

      const [, data] = match
      // Merge only missing fields, preserving labels or notations already present in input.
      if (!hasPrefLabel(propertyItem) && hasPrefLabel(data)) {
        propertyItem.prefLabel = data.prefLabel
      }
      if (!hasNotation(propertyItem) && hasNotation(data)) {
        propertyItem.notation = data.notation
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
