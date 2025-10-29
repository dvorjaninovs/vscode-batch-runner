import * as vscode from 'vscode';

import * as execute from './execute';
import * as batchArgs from './arguments';
import * as utils from './utils';


/**
 * Resolve a Uri from the command argument or the current editor/tab state.
 * This handles cases where the command is invoked from a diff editor. It
 * prefers the currently focused side when possible.
 */
function resolveFileUri(arg?: any): vscode.Uri | undefined {
	// If a Uri was explicitly provided, use it
	if (arg && arg instanceof vscode.Uri)
		return arg;

	// Some VS Code contexts pass an object with a `resourceUri` property
	if (arg && arg.resourceUri && arg.resourceUri instanceof vscode.Uri)
		return arg.resourceUri;

	// Some tab inputs for diff editors expose original/modified (TabInputTextDiff)
	if (arg && arg.original && arg.modified) {
		const active = vscode.window.activeTextEditor;
		if (active) {
			if (utils.compareUri(active.document.uri, arg.original))
				return arg.original;
			if (utils.compareUri(active.document.uri, arg.modified))
				return arg.modified;
		}

		// Fallback to modified (right) if we can't determine focus
		return arg.modified;
	}

	// Fallback to the active text editor document (this should cover most cases,
	// including when focus is on one side of a diff)
	if (vscode.window.activeTextEditor)
		return vscode.window.activeTextEditor.document.uri;

	return undefined;
}

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('batch-runner.execBatchFile', (uri?: vscode.Uri): Promise<boolean> => {
			const filepath = resolveFileUri(uri);
			if (!filepath)
				throw new Error('No file path provided');

			return execute.runBatchFile(filepath, [], false);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('batch-runner.execBatchFileArgs', async (uri?: vscode.Uri): Promise<boolean> => {
			const filepath = resolveFileUri(uri);
			if (!filepath)
				throw new Error('No file path provided');

			const argsToPass = await batchArgs.askForArguments(filepath);
			if (argsToPass !== undefined) {
				return execute.runBatchFile(filepath, argsToPass, false);
			}

			return false;
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('batch-runner.execBatchFileAdmin', (uri?: vscode.Uri): Promise<boolean> => {
			const filepath = resolveFileUri(uri);
			if (!filepath)
				throw new Error('No file path provided');

			return execute.runBatchFile(filepath, [], true);
		})
	);
}


export function deactivate() { }