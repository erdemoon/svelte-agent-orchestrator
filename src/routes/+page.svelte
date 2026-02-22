<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Task } from '$lib/types';

	let prompt = '';
	let tasks: Task[] = [];
	let selectedTask: Task | null = null;
	let loading = false;
	let activeIntervals = new Set<NodeJS.Timeout>();

	async function submitTask() {
		if (!prompt.trim()) return;

		loading = true;
		const response = await fetch('/api/tasks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt })
		});

		const { taskId } = await response.json();
		prompt = '';

		pollTask(taskId);
	}

	async function pollTask(taskId: string) {
		const interval = setInterval(async () => {
			const response = await fetch(`/api/tasks?id=${taskId}`);
			const task: Task = await response.json();
			selectTask(task);
			loading = false;

			const index = tasks.findIndex((t) => t.id === taskId);
			if (index >= 0) {
				tasks[index] = task;
			} else {
				tasks = [task, ...tasks];
			}

			if (selectedTask?.id === taskId) {
				selectedTask = task;
			}

			if (task.status === 'completed' || task.status === 'failed') {
				clearInterval(interval);
				activeIntervals.delete(interval);
			}

			activeIntervals.add(interval);
		}, 1000);
	}

	async function loadTasks() {
		const response = await fetch('/api/tasks');
		tasks = await response.json();
	}

	onMount(loadTasks);

	function selectTask(task: Task) {
		selectedTask = task;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'text-yellow-600';
			case 'running':
				return 'text-blue-600';
			case 'completed':
				return 'text-green-600';
			case 'failed':
				return 'text-red-600';
			default:
				return 'text-gray-600';
		}
	}

	onDestroy(() => {
		activeIntervals.forEach((interval) => clearInterval(interval));
	});
</script>

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-7xl p-8">
		<h1 class="mb-8 text-4xl font-bold">AI Agent Orchestrator</h1>
		<div class="mb-8 rounded-xl bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-semibold">Submit Task</h2>
			<div class="flex gap-4">
				<input
					type="text"
					bind:value={prompt}
					placeholder="e.g., 'Find all engineers in the database and save their names to engineers.txt'"
					class="flex-1 rounded-lg border border-gray-300 px-4 py-2 shadow-xs transition-colors outline-none focus:border-sky-400"
					on:keypress={(e) => e.key === 'Enter' && submitTask()}
				/>
				<button
					on:click={submitTask}
					disabled={loading}
					class="cursor-pointer rounded-lg bg-sky-600 px-6 py-2 text-white shadow-xs transition-colors hover:bg-sky-700 disabled:bg-gray-400"
				>
					{loading ? 'Submitting...' : 'Submit'}
				</button>
			</div>
			<div class="mt-4 text-sm text-gray-600">
				<p class="mb-2 font-semibold">Try these examples:</p>
				<ul class="list-inside list-disc space-y-1">
					<li>Query the database for all users in Engineering department</li>
					<li>Find all engineers in the database and save their names to engineers.txt</li>
					<li>Get the weather in Tokyo and save it to weather.txt</li>
					<li>List all files in the sandbox</li>
				</ul>
			</div>
		</div>
		<div class="grid grid-cols-2 items-start gap-8">
			<div class="rounded-xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-semibold">Tasks ({tasks.length})</h2>
				<div class="space-y-2">
					{#each tasks as task}
						<button
							on:click={() => selectTask(task)}
							class={[
								'w-full cursor-pointer rounded-lg border border-gray-300 p-4 text-left shadow-xs transition-colors hover:bg-gray-100',
								selectedTask?.id === task.id && 'border-sky-400! bg-sky-50!'
							]}
						>
							<div class="mb-2 flex items-start justify-between">
								<span class="text-sm font-medium">{task.id.slice(0, 8)}...</span>
								<span class="text-sm {getStatusColor(task.status)}">
									{task.status}
								</span>
							</div>
							<p class="truncate text-sm text-gray-600">{task.prompt}</p>
							<p class="mt-1 text-xs text-gray-400">
								{new Date(task.createdAt).toLocaleTimeString()}
							</p>
						</button>
					{/each}
				</div>
			</div>
			<div class="rounded-xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-semibold">Task Details</h2>
				{#if selectedTask}
					<div class="space-y-4">
						<div>
							<span class="text-sm font-semibold">Status:</span>
							<span class="ml-2 {getStatusColor(selectedTask.status)}">
								{selectedTask.status}
							</span>
						</div>

						<div>
							<span class="text-sm font-semibold">Prompt:</span>
							<p class="mt-1 text-sm text-gray-700">{selectedTask.prompt}</p>
						</div>
						{#if selectedTask.result}
							<div>
								<span class="text-sm font-semibold">Result:</span>
								<p
									class="mt-1 rounded border border-teal-400 bg-teal-50 p-3 text-gray-700 shadow-xs"
								>
									{selectedTask.result}
								</p>
							</div>
						{/if}
						{#if selectedTask.error}
							<div>
								<span class="text-sm font-semibold text-red-600">Error:</span>
								<p class="mt-1 rounded bg-red-50 p-3 text-sm text-red-600">
									{selectedTask.error}
								</p>
							</div>
						{/if}
						<div>
							<span class="text-sm font-semibold">Execution Steps:</span>
							<div class="mt-2 space-y-2">
								{#each selectedTask.steps as step}
									<div class="rounded bg-gray-50 p-3 text-xs">
										<div class="mb-1 flex justify-between">
											<span class="font-semibold">{step.type}</span>
											<span class="text-gray-500">
												{new Date(step.timestamp).toLocaleTimeString()}
											</span>
										</div>
										<p class="text-gray-700">{step.content}</p>
										{#if step.toolInput}
											<pre class="mt-1 overflow-x-auto rounded bg-blue-50 p-2 text-xs">
  												{JSON.stringify(step.toolInput, null, 2)}
											</pre>
										{/if}
										{#if step.toolOutput}
											<pre class="mt-1 overflow-x-auto rounded bg-green-50 p-2 text-xs">
  												{JSON.stringify(step.toolOutput, null, 2)}
											</pre>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<p class="text-gray-500">Select a task to view details</p>
				{/if}
			</div>
		</div>
	</div>
</div>
