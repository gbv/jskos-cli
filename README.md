# JSKOS Command Line Interface

[![Build Status](https://travis-ci.com/gbv/jskos-cli.svg?branch=master)](https://travis-ci.com/gbv/jskos-cli)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/jskos-cli.svg?label=version)](https://github.com/gbv/jskos-cli)
[![NPM package name](https://img.shields.io/badge/npm-jskos--tools-blue.svg)](https://www.npmjs.com/package/jskos-cli)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> Command Line Applications to process JSKOS data format.

This repository contains command client applications for working with the [JSKOS data format for knowledge organization systems](http://gbv.github.io/jskos/).

By now the application is just a wrapper around [jskos-tools](https://www.npmjs.com/package/jskos-tools).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [jskos-convert](#jskos-convert)
  - [jskos-validate](#jskos-validate)
- [Build](#build)
- [Test](#test)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
npm install -g jskos-cli
```

## Usage

### jskos-convert

~~~
Usage: jskos-convert [options] [type] [files...]

Options:
  -V, --version          output the version number
  --list-types           list JSKOS object types
  -f, --from <format>    input format (ndjson or csv)
  -t, --to <format>      output format (ndjson or csv)
  -v, --validate         validate and omit invalid records
  -l, --language <lang>  include labels (use '-' for any language)
  -h, --help             output usage information

Examples:
  $ jskos-convert mappings -t csv mappings.ndjson
  $ jskos-convert concepts http://example.org/jskos.ndjson
~~~

CSV format is only supported for mappings by now.

### jskos-validate

Validate a set of ndjson files and emit result in [TAP format](https://testanything.org/).

~~~
Usage: jskos-validate [options] [type] files...

Options:
  -V, --version  output the version number
  --list-types   list JSKOS object types
  -h, --help     output usage information

Examples:
  $ jskos-validate mappings mappings.ndjson
~~~

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

MIT © 2018- Verbundzentrale des GBV (VZG)
