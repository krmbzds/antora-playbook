'use strict'

const customSortComponents = require('./custom-sort-components')

function exportNavigationData (components, config, homeUrl) {
  const navigationData = customSortComponents(components, config.components).map(({ name, title, versions }) => ({
    name,
    title,
    versions: versions
      .filter(({ site }) => !site)
      .map(({ version, displayVersion, navigation = [], prerelease }) => {
        if (displayVersion === version) displayVersion = undefined
        return { version, displayVersion, prerelease: prerelease && true, sets: strain(navigation) }
      }),
  }))
  const navigationDataSource = [`siteNavigationData=${JSON.stringify(navigationData)}`]
  if (config.subcomponents) {
    navigationDataSource.push(`siteNavigationData.subcomponents=${JSON.stringify(config.subcomponents)}`)
  }
  if (config.groups) navigationDataSource.push(`siteNavigationData.groups=${JSON.stringify(config.groups)}`)
  if (homeUrl) navigationDataSource.push(`siteNavigationData.homeUrl="${homeUrl}"`)
  const relativePath = config.outputFile
  return {
    contents: Buffer.from(navigationDataSource.join('\n')),
    mediaType: 'application/javascript',
    out: { path: relativePath },
    path: relativePath,
    pub: { url: '/' + relativePath, rootPath: '' },
    src: { stem: relativePath.slice(0, relativePath.lastIndexOf('.')) },
  }
}

function strain (items) {
  return items.map((item) => {
    const strainedItem = { content: item.content }
    const urlType = item.urlType
    if (urlType) {
      strainedItem.url = item.url
      if (urlType !== 'internal') strainedItem.urlType = item.urlType
    }
    if (item.items) strainedItem.items = strain(item.items)
    return strainedItem
  })
}

module.exports = exportNavigationData
