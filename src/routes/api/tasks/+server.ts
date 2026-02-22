import { json, type RequestHandler } from '@sveltejs/kit';

import { AgentOrchestrator } from '$lib/agent/orchestrator';
import type { Task } from '$lib/types';

const orchestrator = new AgentOrchestrator();
const tasks = new Map<string, Task>();

export const POST: RequestHandler = async ({ request }) => {
	const { prompt } = await request.json();

	const task: Task = {
		id: crypto.randomUUID(),
		prompt,
		status: 'pending',
		steps: [],
		createdAt: new Date()
	};

	tasks.set(task.id, task);

	orchestrator.executeTask(task).then((updatedTask) => {
		tasks.set(task.id, updatedTask);
	});

	return json({ taskId: task.id });
};

export const GET: RequestHandler = async ({ url }) => {
	const taskId = url.searchParams.get('id');

	if (taskId) {
		const task = tasks.get(taskId);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}
		return json(task);
	}

	return json(Array.from(tasks.values()));
};
