const path = require('path')

const {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind
} = require('vscode-languageserver')

const { Diagnostic, DiagnosticSeverity, Position, Range } = require('vscode-languageserver-types')
const { TextDocument } = require('vscode-languageserver-textdocument')
const { URI } = require('vscode-uri')

const connection = createConnection(ProposedFeatures.all)
const documents = new TextDocuments(TextDocument)

const validateLanguages = ['feature']

function clearDiagnostics(document) {
  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics: []
  })
}

function isDocumentValidatable(document) {
  return validateLanguages.includes(document.languageId)
}

function handleError(err) {
  if(err.reasons) {
    for(const reason of err.reasons) {
      connection.window.showErrorMessage(`gherkin-lint: ${reason}`)
    }

    return
  }

  connection.window.showErrorMessage((err.stack || '').replace(/\n/gu, ' '))
}

async function gherkinLint() {
  const configParser = require('gherkin-lint/dist/config-parser')
  const linter = require('gherkin-lint/dist/linter')
  const featureFinder = require('gherkin-lint/dist/feature-finder')
  const noDupe = require('./rules/no-dupe-feature-names-2')
  const config = configParser.getConfiguration()
  config['no-dupe-feature-names-2'] = config['no-dupe-feature-names']
  delete config['no-dupe-feature-names']
  noDupe.clear()
  return linter.lint(featureFinder.getFeatureFiles(['features/']), config, [path.join(__dirname, 'rules')])
}

async function validate(document) {
  if(!isDocumentValidatable(document)) {
    return
  }

  try {
    const results = await gherkinLint()
    await handleValidationResults(document, results)
  } catch(err) {
    handleError(err)
  }
}

async function handleValidationResults(document, results) {
  if(!isDocumentValidatable(document)) {
    return
  }
  const documentPath = URI.parse(document.uri).fsPath
  try {
    const documentResults = results.find(result => result.filePath === documentPath) || { errors: [] }
    connection.console.log(`documentResults: ${JSON.stringify(documentResults)}`)
    const result = {
      diagnostics: documentResults.errors.map(error => {
        const line = Number.parseInt(error.line, 10)
        const startPosition = Position.create(line - 1, 0)
        const endPosition = Position.create(line, 0)

        return Diagnostic.create(
          Range.create(startPosition, endPosition),
          error.message,
          DiagnosticSeverity.Error,
          error.rule,
          'gherkin-lint'
        )
      })
    }

    connection.sendDiagnostics({
      uri: document.uri,
      diagnostics: result.diagnostics
    })
  } catch(err) {
    handleError(err)
  }
}

async function validateAll() {
  try {
    const results = await gherkinLint()
    for(const document of documents.all()) {
      await handleValidationResults(document, results)
    }
  } catch(err) {
    handleError(err)
  }
}

connection.onInitialize(() => {
  validateAll()

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        save: true,
        change: TextDocumentSyncKind.Full
      }
    }
  }
})

connection.onDidChangeWatchedFiles(validateAll)

documents.onDidChangeContent(({ document }) => validate(document))

documents.onDidClose(({ document }) => {
  clearDiagnostics(document)
})
documents.onDidSave(({ document }) => {
  validate(document)
})

connection.onExecuteCommand(async(params) => {
  if(params.command === 'vscode-gherkin-lint.executeLint') {
    validateAll()
  }

  return {}
})

documents.listen(connection)

connection.listen()
