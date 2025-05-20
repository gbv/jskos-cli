export const conceptFromNotation = (scheme, notation) => {
  const concept = scheme.conceptFromNotation(notation, { inScheme: true })
  if (concept) {
    return concept
  } else if (scheme.uriPattern || scheme.namespace) {
    console.error(`invalid notation: "${notation}"`)
  } else {
    console.error(`can't map notation "${notation}" to URI`)
  }
}

import { fileURLToPath } from "url"
import { dirname as dirnamePath, resolve } from "path"
import { readFile } from "fs/promises"

export function dirname(url) {
  return dirnamePath(fileURLToPath(url))
}

export async function readJSONFile(file, url) {
  return JSON.parse(await readFile(resolve(dirname(url), file), "utf8"))
}

export const DEFAULT_JSKOS_PROPERTIES = [
  // Resource-level sets
  "creator",
  "contributor",
  "source",
  "publisher",
  "partOf",

  // Item-level sets
  "startPlace",
  "endPlace",
  "place",
  "replacedBy",
  "basedOn",
  "subject",
  "subjectOf",
] 
