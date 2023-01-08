'use strict'


const { homedir } = require('os')
const { cwd: pwd } = process
const [getFirstSegment, isAbsolute, { join, normalize, resolve }] = ((path) => [
  path === path.posix
    ? (str, idx) => (~(idx = str.indexOf('/')) ? str.substr(0, idx) : undefined)
    : (str, idx) => (~(idx = str.indexOf('/')) || ~(idx = str.indexOf('\\')) ? str.substr(0, idx) : undefined),
  path === path.posix ? () => false : path.isAbsolute,
  path,
])(require('path'))

function expandPath (path, context = {}) {
  if (typeof path !== 'string') {
    throw new TypeError(`The "path" argument must be of type string. Received type ${typeof path}`)
  }
  let { base = '~+', cwd, dot = '.' } = context.constructor === Object ? context : { base: context }
  if (base === '.') base = dot
  const getcwd = cwd === undefined ? pwd : () => cwd
  switch (path) {
    case '':
      return base === '~+' ? getcwd() : base === '~' ? homedir() : resolve(base)
    case '.':
      if (dot === '.') dot = base
      return dot === '~' ? homedir() : dot === '~+' ? getcwd() : resolve(dot)
    case '~':
      return homedir()
    case '~+':
      return getcwd()
    default:
      switch (getFirstSegment(path)) {
        case '':
          return normalize(path)
        case '.':
          if (dot !== '.') base = dot
          break
        case '~':
          return join(homedir(), path.substr(2))
        case '~+':
          return join(getcwd(), path.substr(3))
        default:
          if (isAbsolute(path)) return normalize(path)
      }
      return base === '~+' ? join(getcwd(), path) : base === '~' ? join(homedir(), path) : resolve(base, path)
  }
}

const exportNavigationData = require('./export-navigation-data')
const { promises: fsp } = require('fs')

module.exports.register = function ({ config: { configFile = './antora-navigator.yml' } }) {
  this.once('beforePublish', async ({ playbook, siteAsciiDocConfig, contentCatalog, siteCatalog }) => {
    const { 'site-component-order': siteComponentOrder, 'site-navigation-data-path': siteNavigationDataPath } =
      siteAsciiDocConfig.attributes
    const ownComponents = contentCatalog.getComponents().filter(({ site }) => !site)
    const navConfig = await loadYamlFile.call(this, expandPath(configFile, '~+', playbook.dir))
    if ('output_file' in navConfig) {
      navConfig.outputFile = navConfig.output_file
      delete navConfig.output_file
    }
    if (!navConfig.outputFile) navConfig.outputFile = siteNavigationDataPath || 'site-navigation-data.js'
    if (siteComponentOrder && !('components' in navConfig)) navConfig.components = siteComponentOrder
    const startPage = contentCatalog.getSiteStartPage()
    siteCatalog.addFile(exportNavigationData(ownComponents, navConfig, startPage && startPage.pub.url))
  })
}

function loadYamlFile (path) {
  const yaml = require(require.resolve('js-yaml', {
    paths: [require.resolve('@antora/playbook-builder', { paths: this.module.paths }) + '/..'],
  }))
  return fsp.readFile(path).then(
    (contents) => yaml.load(contents, { schema: yaml.CORE_SCHEMA }),
    () => ({})
  )
}
