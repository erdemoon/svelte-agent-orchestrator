import type { Tool } from '$lib/types';
import { filesystemTool, writeFileTool, listFilesTool } from './filesystem';
import { queryDatabaseTool } from './database';
import { weatherTool, httpGetTool } from './api';

export class ToolRegistry {
	private tools: Map<string, Tool> = new Map();

	constructor() {
		this.register(filesystemTool);
		this.register(writeFileTool);
		this.register(listFilesTool);
		this.register(queryDatabaseTool);
		this.register(weatherTool);
		this.register(httpGetTool);
	}

	register(tool: Tool) {
		this.tools.set(tool.name, tool);
	}

	get(name: string): Tool | undefined {
		return this.tools.get(name);
	}

	getAll(): Tool[] {
		return Array.from(this.tools.values());
	}

	getGroqTools() {
		return this.getAll().map((tool) => ({
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.parameters
			}
		}));
	}

	async executeTool(name: string, params: any): Promise<any> {
		const tool = this.get(name);
		if (!tool) {
			throw new Error(`Tool not found: ${name}`);
		}

		const validation = this.validateParams(tool, params);
		if (!validation.valid) {
			return { success: false, error: `Validation failed: ${validation.error}` };
		}

		return Promise.race([
			tool.execute(params),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Tool execution timeout')), 30000)
			)
		]);
	}

	private validateParams(tool: Tool, params: any): { valid: boolean; error?: string } {
		const schema = tool.parameters;

		for (const required of schema.required) {
			if (!(required in params)) {
				return { valid: false, error: `Missing required field: ${required}` };
			}
		}

		for (const [key, value] of Object.entries(params)) {
			const expectedType = schema.properties[key]?.type;
			const actualType = typeof value;

			if (expectedType === 'string' && actualType !== 'string') {
				return { valid: false, error: `${key} must be a string` };
			}
			if (expectedType === 'number' && actualType !== 'number') {
				return { valid: false, error: `${key} must be a number` };
			}
		}

		return { valid: true };
	}
}
