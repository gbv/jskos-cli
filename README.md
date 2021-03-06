# JSKOS Command Line Interface

[![Test](https://github.com/gbv/jskos-cli/actions/workflows/test.yml/badge.svg)](https://github.com/gbv/jskos-cli/actions/workflows/test.yml)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/jskos-cli.svg?label=version)](https://github.com/gbv/jskos-cli)
[![NPM package name](https://img.shields.io/badge/npm-jskos--cli-blue.svg)](https://www.npmjs.com/package/jskos-cli)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> Command Line Applications to process JSKOS data format.

This repository contains command client applications for working with the [JSKOS data format for knowledge organization systems](http://gbv.github.io/jskos/).

## Table of Contents

- [JSKOS Command Line Interface](#jskos-command-line-interface)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Usage](#usage)
    - [jskos-validate](#jskos-validate)
    - [jskos-convert](#jskos-convert)
  - [Build](#build)
  - [Test](#test)
  - [Maintainers](#maintainers)
  - [Contribute](#contribute)
  - [License](#license)

## Install

```bash
npm install -g jskos-cli
```

This provides two commands, `jskos-validate` and `jskos-convert` (see below).

Requires at least Node.js 10.

## Usage

### jskos-validate

Validate a set of ndjson files in JSKOS format and emit result in [TAP format](https://testanything.org/).

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
  $ jskos-validate --list-types
~~~

If JSKOS is read from standard input, only invalid records are reported.

### jskos-convert

Convert concepts and/or mappings between CSV and JSKOS format.

~~~
Usage: jskos-convert [options] [type] [files...]

Options:
  -V, --version                     output the version number
  --list-types                      list JSKOS object types
  -f, --from <format>               input format (ndjson or csv)
  -t, --to <format>                 output format (ndjson, csv, nt)
  -v, --validate                    validate and omit invalid records
  -l, --language <lang>             include labels (use '-' for any language)
  -r, --registry <file>             registry file with schemes, types... to look up
  -s, --scheme <uri|notation|file>  which scheme to use when converting concepts
  -h, --help                        output usage information

Examples:
  $ jskos-convert mappings -t csv mappings.ndjson
  $ jskos-convert concepts -r registry.json -s example http://example.org/jskos.csv
~~~

Concepts in CSV format can be specified with:

* `notation` to build URIs from
* `prefLabel` and `scopeNote` (if a language is specified)
* `level` and/or `broaderNotation` for hierarchies. CSV output uses `broaderNotation`.

Multi-hierarchies are not supported when converting from and/or to CSV.

Mappings in CSV format can be specified with:

* `fromNotation`
* `fromLabel` (if a language is specified)
* `toNotation`
* `toLabel` (if a language is specified)
* `type`
* `creator`

1-to-n mappings are not supported yet.

## Build

```bash
git clone --recursive https://github.com/gbv/jskos-cli.git
cd jskos-cli
npm install
```

## Test

```bash
npm test
```

## Maintainers

- [@nichtich](https://github.com/nichtich)
- [@stefandesu](https://github.com/stefandesu)

## Contribute

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details!

## License

MIT (c) 2020 Verbundzentrale des GBV (VZG)
