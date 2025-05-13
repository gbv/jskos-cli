// config.js
export default [
  {
    uri: "http://bartoc.org/en/node/241",
    prefLabel: { en: "Dewey Decimal Classification" },
    uriPattern: "http://dewey.info/class/(.+)/e23/",
    API: [
      {
        type: "http://bartoc.org/api-type/jskos",
        url: "https://coli-conc.gbv.de/api/",
        status: "https://coli-conc.gbv.de/api/status",
      },
    ],
  },
  {
    uri: "http://bartoc.org/en/node/15",
    prefLabel: { en: "Multilingual Thesaurus of the European Union" },
    uriPattern: "http://eurovoc.europa.eu/(.+)",
    namespace: "http://eurovoc.europa.eu/",
    identifier: ["http://bartoc.org/en/node/15"],
    API: [
      {
        type: "http://bartoc.org/api-type/skosmos",
        url: "https://skosmos.bartoc.org/15/",
      },
    ],
  },
  {
    uri: "http://bartoc.org/en/node/472",
    prefLabel: { en: "Integrative Levels Classification" },
    uriPattern: "http://(www\\.)?iskoi\\.org/ilc/(\\d+)/class/([A-Za-z0-9-]+)",
    namespace: "http://www.iskoi.org/ilc/2/class/",
    identifier: ["http://bartoc.org/en/node/472"],
    API: [
      {
        type: "http://bartoc.org/api-type/skosmos",
        url: "https://skosmos.bartoc.org/472/",
      },
    ],
  },
]
