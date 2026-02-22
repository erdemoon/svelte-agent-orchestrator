export interface Tool {
	name: string;
	description: string;
	parameters: {
		type: 'object';
		properties: Record<string, any>;
		required: string[];
	};
	execute: (params: any) => Promise<any>;
}

export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface Task {
	id: string;
	prompt: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	result?: any;
	error?: string;
	steps: ExecutionStep[];
	createdAt: Date;
	completedAt?: Date;
}

export interface ExecutionStep {
	timestamp: Date;
	type: 'thinking' | 'tool_call' | 'tool_result' | 'final';
	content: string;
	toolName?: string;
	toolInput?: any;
	toolOutput?: any;
}
