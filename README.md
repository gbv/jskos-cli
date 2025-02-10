# JSKOS Command Line Interface

[![Test](https://github.com/gbv/jskos-cli/actions/workflows/test.yml/badge.svg)](https://github.com/gbv/jskos-cli/actions/workflows/test.yml)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/jskos-cli.svg?label=version)](https://github.com/gbv/jskos-cli)
[![NPM package name](https://img.shields.io/badge/npm-jskos--cli-blue.svg)](https://www.npmjs.com/package/jskos-cli)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> Command Line Applications to process JSKOS data format.

This repository contains command client applications for working with the [JSKOS data format for knowledge organization systems](http://gbv.github.io/jskos/). The applications are basically wrappers around [jskos-validate](https://www.npmjs.com/package/jskos-validate) and [jskos-tools](https://www.npmjs.com/package/jskos-tools).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [jskos-validate](#jskos-validate)
  - [jskos-convert](#jskos-convert)
- [Maintainers](#maintainers)
- [Publish](#publish)
- [Contributing](#contributing)
- [License](#license)

## Install

Install globally to provide commands `jskos-validate` and `jskos-convert`:

```bash
npm install -g jskos-cli
```

## Usage

### jskos-validate

Validate a set of ndjson files in JSKOS format.

~~~

Usage: jskos-validate [options] [type] files...

Options:
  -V, --version  output the version number
  -q, --quiet    suppress status messages
  --list-types   list JSKOS object types
  -v, --verbose  show error messages
  -u, --unknown  allow unknown fields
  -h, --help     output usage information

Examples:
  $ jskos-validate -v concepts concepts.ndjson
  $ jskos-validate -u mappings mappings.ndjson
  $ jskos-validate schemes.ndjson concepts.ndjson
~~~

Validation result is emitted in [TAP format](https://testanything.org/). Errors are reported as diagnostic lines with record number. If JSKOS is read from standard input, only invalid records are reported. Exit code is the number of errors (up to 100).

### jskos-convert

Convert between JSKOS and other formats (by now only CSV and RDF/N-Triples).

~~~
Usage: jskos-convert [options] [type] [files...]

Options:
  -V, --version                          output the version number
  -q, --quiet                            suppress status messages
  --list-types                           list JSKOS object types
  -f, --from <format>                    input format (ndjson or csv)
  -t, --to <format>                      output format (ndjson, csv, nt)
  -c, --clean                            cleanup input data
  -v, --validate                         validate and omit invalid records
  -l, --language <lang>                  include labels (use '-' for any language)
  -r, --registry <file>                  registry file with schemes, types... to look up
  -s, --scheme <uri|notation|file>       concept scheme to convert concepts or mappings
  -d, --destination <uri|notation|file>  target scheme to convert mappings
  -p, --partof <uri>                     concordance URI
  -m, --marktop                          explicitly mark concepts without broader as top concepts
  --creator <uri and/or name>            add creator to mappings
  -h, --help                             display help for command

Examples:
  $ jskos-convert mappings -t csv mappings.ndjson
  $ jskos-convert concepts -r registry.json -s example http://example.org/jskos.csv
~~~

Concepts in CSV format can be specified with:

* `notation` to build URIs from
* `prefLabel` (if default language is specified) and `prefLabel@xx` (with explicit language code `xx`)
* `altLabel` (if default language is specified) and `altLabel@xx` (with explicit language code `xx`)
* `scopeNote` (if default language is specified) and `scopeNote@xx` (with explicit language code `xx`)
* `level` and/or `broaderNotation` for hierarchies. CSV output uses `broaderNotation`.

Multi-hierarchies are not supported when converting from and/or to CSV.

Mappings in CSV format can be specified with:

* `fromNotation`
* `fromLabel` (if a language is specified, ignored when converting from CSV)
* `toNotation`
* `toLabel` (if a language is specified, ignored when converting from CSV)
* `type`
* `creator` (URI and/or name, separated by a space, in that order; e.g: "https://github.com/stefandesu Stefan Peters")
* `created` (Date of creation)
* `uri` (URI of a mapping)

1-to-n mappings are not supported yet.

## Maintainers

- [@nichtich](https://github.com/nichtich)

## Publish

Please work on the `dev` branch during development (or better yet, develop in a feature branch and merge into `dev` when ready).

When a new release is ready (i.e. the features are finished, merged into `dev`, and all tests succeed), run the included release script (replace "patch" with "minor" or "major" if necessary):

```bash
npm run release:patch # or minor, or major
```

This will:
- Check that we are on `dev`
- Run tests and build to make sure everything works
- Make sure `dev` is up-to-date
- Run `npm version patch` (or "minor"/"major")
- Push changes to `dev`
- Switch to `main`
- Merge changes from `dev`
- Push `main` with tags
- Switch back to `dev`

After running this, GitHub Actions will **automatically publish the new version to npm**. It will also create a new GitHub Release draft. Please **edit and publish the release draft manually**.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details!

## License

MIT (c) 2020 Verbundzentrale des GBV (VZG)
