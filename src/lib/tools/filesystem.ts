import type { Tool } from '$lib/types';
import fs from 'fs/promises';
import path from 'path';

const SANDBOX_DIR = path.join(process.cwd(), 'sandbox');

await fs.mkdir(SANDBOX_DIR, { recursive: true }).catch(() => {});

export const filesystemTool: Tool = {
	name: 'read_file',
	description: 'Read contents of a file from the sandbox directory',
	parameters: {
		type: 'object',
		properties: {
			filename: {
				type: 'string',
				description: 'Name of the file to read (must be in sandbox directory)'
			}
		},
		required: ['filename']
	},
	execute: async (params: { filename: string }) => {
		try {
			const safePath = path.join(SANDBOX_DIR, path.basename(params.filename));
			const content = await fs.readFile(safePath, 'utf-8');
			return { success: true, content };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
};

export const writeFileTool: Tool = {
	name: 'write_file',
	description: 'Write content to a file in the sandbox directory',
	parameters: {
		type: 'object',
		properties: {
			filename: {
				type: 'string',
				description: 'Name of the file to write'
			},
			content: {
				type: 'string',
				description: 'Content to write to the file'
			}
		},
		required: ['filename', 'content']
	},
	execute: async (params: { filename: string; content: string }) => {
		try {
			const safePath = path.join(SANDBOX_DIR, path.basename(params.filename));
			await fs.writeFile(safePath, params.content, 'utf-8');
			return { success: true, path: safePath };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
};

export const listFilesTool: Tool = {
	name: 'list_files',
	description: 'List all files in the sandbox directory',
	parameters: {
		type: 'object',
		properties: {},
		required: []
	},
	execute: async () => {
		try {
			const files = await fs.readdir(SANDBOX_DIR);
			return { success: true, files };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
};
