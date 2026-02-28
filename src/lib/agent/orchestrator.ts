import Groq from 'groq-sdk';
import { ToolRegistry } from '$lib/tools/registry';
import type { Task } from '$lib/types';
import { GROQ_API_KEY } from '$env/static/private';

export class AgentOrchestrator {
	private groq: Groq;
	private toolRegistry: ToolRegistry;
	private maxIterations = 10;

	constructor() {
		this.groq = new Groq({ apiKey: GROQ_API_KEY });
		this.toolRegistry = new ToolRegistry();
	}

	async executeTask(task: Task): Promise<Task> {
		const messages: any[] = [
			{
				role: 'system',
				content: `You are a precise task execution agent. Your job is to complete the user's request - nothing more, nothing less.

                CORE PRINCIPLE: Execute exactly what is requested. Do not anticipate needs or add helpful extras.

                DECISION RULES:
                - If the user asks to "query" or "find" or "get" data → use the appropriate tool and return the data
                - If the user asks to "save" or "write" or "create a file" → only then use write_file
                - If the user asks to "read" a file → only then use read_file
                - If a file doesn't exist and user didn't ask to create it → report that it doesn't exist, don't create it

                RESPONSE FORMAT:
                - After executing tools, present the actual data/results
                - Do not add commentary like "for clarity" or "for example"
                - Do not suggest additional actions unless asked

                EXAMPLES:

                User: "Query the database for engineers"
                Correct: [query_database] → "Found 2 engineers: Alice Johnson, Carol Davis"
                Wrong: [query_database] → [write_file] → "I queried and also saved to file for clarity"

                User: "Get weather in Tokyo and save it"
                Correct: [get_weather] → [write_file] → "Weather saved to file"
                Wrong: [get_weather] → "Temperature is 15°C" (missing the save step)

                User: "Read users.txt"
                If exists: [read_file] → show contents
                If missing: Report "users.txt does not exist" (do NOT create it)

                Be helpful by being precise, not by doing extra work.
                    `
			},
			{
				role: 'user',
				content: task.prompt
			}
		];

		task.status = 'running';
		let iterations = 0;

		try {
			while (iterations < this.maxIterations) {
				iterations++;

				const response = await this.groq.chat.completions.create({
					model: 'openai/gpt-oss-120b',
					messages,
					tools: this.toolRegistry.getGroqTools(),
					tool_choice: 'auto',
					max_tokens: 1000
				});

				const message = response.choices[0].message;
				messages.push(message);

				if (!message.tool_calls || message.tool_calls.length === 0) {
					task.steps.push({
						timestamp: new Date(),
						type: 'final',
						content: message.content || 'Task completed'
					});
					task.result = message.content;
					task.status = 'completed';
					task.completedAt = new Date();
					break;
				}

				for (const toolCall of message.tool_calls) {
					const toolName = toolCall.function.name;
					let toolArgs;

					try {
						toolArgs = JSON.parse(toolCall.function.arguments);
					} catch (e) {
						console.error('Failed to parse tool arguments:', e);
						continue;
					}

					task.steps.push({
						timestamp: new Date(),
						type: 'tool_call',
						content: `Calling ${toolName}`,
						toolName,
						toolInput: toolArgs
					});

					try {
						const result = await this.toolRegistry.executeTool(toolName, toolArgs);

						task.steps.push({
							timestamp: new Date(),
							type: 'tool_result',
							content: `Tool ${toolName} completed`,
							toolName,
							toolOutput: result
						});

						messages.push({
							role: 'tool',
							tool_call_id: toolCall.id,
							content: JSON.stringify(result)
						});
					} catch (error: any) {
						task.steps.push({
							timestamp: new Date(),
							type: 'tool_result',
							content: `Tool ${toolName} failed: ${error.message}`,
							toolName,
							toolOutput: { error: error.message }
						});

						messages.push({
							role: 'tool',
							tool_call_id: toolCall.id,
							content: JSON.stringify({ error: error.message })
						});
					}
				}
			}

			if (iterations >= this.maxIterations) {
				task.status = 'failed';
				task.error = 'Maximum iterations reached';
			}
		} catch (error: any) {
			task.status = 'failed';
			task.error = error.message;
			task.steps.push({
				timestamp: new Date(),
				type: 'final',
				content: `Error: ${error.message}`
			});
		}

		return task;
	}
}
