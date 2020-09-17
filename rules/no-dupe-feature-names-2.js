const rule = 'no-dupe-feature-names-2'
let features = []

function clear() {
  features = []
}

function run(feature, file) {
  if(!feature) {
    return []
  }
  const errors = []
  if(feature.name in features) {
    const dupes = features[feature.name].files.join(', ')
    features[feature.name].files.push(file.relativePath)
    errors.push({
      message: 'Feature name is already used in: ' + dupes,
      rule: rule,
      line: feature.location.line
    })
  } else {
    features[feature.name] = { files: [file.relativePath] }
  }

  return errors
}

module.exports = {
  name: rule,
  run: run,
  clear
}
