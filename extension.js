const { workspace, commands, window } = require('vscode')
const { LanguageClient, SettingMonitor, ExecuteCommandRequest } = require('vscode-languageclient')

function activate(context) {
  const serverPath = require.resolve('./server.js')

  const client = new LanguageClient(
    'gherkin-lint',
    {
      run: {
        module: serverPath
      },
      debug: {
        module: serverPath,
        options: {
          execArgv: ['--nolazy', '--inspect=6004']
        }
      }
    },
    {
      documentSelector: [{ scheme: 'file' }, { scheme: 'untitled' }],
      diagnosticCollectionName: 'gherkin-lint',
      synchronize: {
        configurationSection: 'gherkin-lint',
        fileEvents: workspace.createFileSystemWatcher(
          '.gherkin-lintrc{.json},.gherkin-lintignore}'
        )
      }
    }
  )

  context.subscriptions.push(
    commands.registerCommand('vscode-gherkin-lint.executeLint', async() => {
      const params = {
        command: 'vscode-gherkin-lint.executeLint',
        arguments: []
      }

      await client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, () => {
        window.showErrorMessage(
          'Failed to run vscode-gherkin-lint'
        )
      })
    })
  )

  context.subscriptions.push(new SettingMonitor(client, 'vscode-gherkin-lint.enable').start())
}

exports.activate = activate

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
