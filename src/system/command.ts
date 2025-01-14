import type { Command as CoreCommand, Disposable, Uri } from 'vscode';
import { commands } from 'vscode';
import type { Action, ActionContext } from '../api/gitlens';
import type { Command } from '../commands/base';
import type { CoreCommands, CoreGitCommands, TreeViewCommands } from '../constants';
import { Commands } from '../constants';
import { Container } from '../container';
import { isWebviewContext } from './webview';

export type CommandCallback = Parameters<typeof commands.registerCommand>[1];

type CommandConstructor = new (container: Container, ...args: any[]) => Command;
const registrableCommands: CommandConstructor[] = [];

export function command(): ClassDecorator {
	return (target: any) => {
		registrableCommands.push(target);
	};
}

export function registerCommand(command: string, callback: CommandCallback, thisArg?: any): Disposable {
	return commands.registerCommand(
		command,
		function (this: any, ...args) {
			let context: any;
			if (command === Commands.GitCommands) {
				const arg = args?.[0];
				if (arg?.command != null) {
					context = { mode: args[0].command };
					if (arg?.state?.subcommand != null) {
						context.submode = arg.state.subcommand;
					}
				}
			}
			Container.instance.telemetry.sendEvent('command', { command: command, context: context });
			callback.call(this, ...args);
		},
		thisArg,
	);
}

export function registerWebviewCommand(command: string, callback: CommandCallback, thisArg?: any): Disposable {
	return commands.registerCommand(
		command,
		function (this: any, ...args) {
			Container.instance.telemetry.sendEvent('command', {
				command: command,
				webview: isWebviewContext(args[0]) ? args[0].webview : '<missing>',
			});
			callback.call(this, ...args);
		},
		thisArg,
	);
}

export function registerCommands(container: Container): Disposable[] {
	return registrableCommands.map(c =>
		c.name === 'FocusCommand' ? new c(container, undefined, true) : new c(container),
	);
}

export function asCommand<T extends unknown[]>(
	command: Omit<CoreCommand, 'arguments'> & { arguments: [...T] },
): CoreCommand {
	return command;
}

export function executeActionCommand<T extends ActionContext>(action: Action<T>, args: Omit<T, 'type'>) {
	return commands.executeCommand(`${Commands.ActionPrefix}${action}`, { ...args, type: action });
}

export function createCommand<T extends unknown[]>(
	command: Commands | TreeViewCommands,
	title: string,
	...args: T
): CoreCommand {
	return {
		command: command,
		title: title,
		arguments: args,
	};
}

export function executeCommand<U = any>(command: Commands): Thenable<U>;
export function executeCommand<T = unknown, U = any>(command: Commands, arg: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: Commands, ...args: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: Commands, ...args: T): Thenable<U> {
	return commands.executeCommand<U>(command, ...args);
}

export function createCoreCommand<T extends unknown[]>(command: CoreCommands, title: string, ...args: T): CoreCommand {
	return {
		command: command,
		title: title,
		arguments: args,
	};
}

export function executeCoreCommand<T = unknown, U = any>(command: CoreCommands, arg: T): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreCommands,
	...args: T
): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreCommands,
	...args: T
): Thenable<U> {
	if (
		command != 'setContext' &&
		command !== 'vscode.executeDocumentSymbolProvider' &&
		command !== 'vscode.changes' &&
		command !== 'vscode.diff' &&
		command !== 'vscode.open'
	) {
		Container.instance.telemetry.sendEvent('command/core', { command: command });
	}
	return commands.executeCommand<U>(command, ...args);
}

export function createCoreGitCommand<T extends unknown[]>(
	command: CoreGitCommands,
	title: string,
	...args: T
): CoreCommand {
	return {
		command: command,
		title: title,
		arguments: args,
	};
}

export function executeCoreGitCommand<U = any>(command: CoreGitCommands): Thenable<U>;
export function executeCoreGitCommand<T = unknown, U = any>(command: CoreGitCommands, arg: T): Thenable<U>;
export function executeCoreGitCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreGitCommands,
	...args: T
): Thenable<U>;
export function executeCoreGitCommand<T extends [...unknown[]] = [], U = any>(
	command: CoreGitCommands,
	...args: T
): Thenable<U> {
	Container.instance.telemetry.sendEvent('command/core', { command: command });
	return commands.executeCommand<U>(command, ...args);
}

export function executeEditorCommand<T>(command: Commands, uri: Uri | undefined, args: T) {
	return commands.executeCommand(command, uri, args);
}
