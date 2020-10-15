const rule = 'no-dupe-feature-names-2'
const features = new Map()

function clear() {
  features.clear()
}

function run(feature, file) {
  if(!feature) {
    return []
  }
  const errors = []
  if(features.has(feature.name)) {
    const fileSet = features.get(feature.name)
    const dupes = [...fileSet.values()].filter(filePath => filePath !== file.relativePath)
    if(!dupes.length) {
      return []
    }
    fileSet.add(file.relativePath)
    errors.push({
      message: 'Feature name is already used in: ' + dupes.join(', '),
      rule: rule,
      line: feature.location.line
    })
  } else {
    features.set(feature.name, new Set([file.relativePath]))
  }

  return errors
}

module.exports = {
  name: rule,
  run: run,
  clear
}
