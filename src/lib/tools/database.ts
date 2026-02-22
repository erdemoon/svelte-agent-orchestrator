import type { Tool } from '$lib/types';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'sandbox', 'demo.db');
const db = new Database(DB_PATH);
const dangerousKeywords = [
	'DROP',
	'DELETE',
	'INSERT',
	'UPDATE',
	'ALTER',
	'CREATE',
	'TRUNCATE',
	'EXEC',
	'EXECUTE',
	'--',
	';--',
	'/*',
	'*/',
	'UNION'
];

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT
  );
`);

const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (count.count === 0) {
	const insert = db.prepare('INSERT INTO users (name, email, department) VALUES (?, ?, ?)');
	insert.run('Alice Johnson', 'alice@example.com', 'Engineering');
	insert.run('Bob Smith', 'bob@example.com', 'Sales');
	insert.run('Carol Davis', 'carol@example.com', 'Engineering');
	insert.run('David Brown', 'david@example.com', 'Marketing');
}

export const queryDatabaseTool: Tool = {
	name: 'query_database',
	description:
		'Execute a SELECT query on the database. Only SELECT queries are allowed for safety.',
	parameters: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'SQL SELECT query to execute'
			}
		},
		required: ['query']
	},
	execute: async (params: { query: string }) => {
		try {
			const query = params.query.trim();
			const normalized = query.toUpperCase();

			if (query.length > 500) {
				return {
					success: false,
					error: 'Query too long (max 500 characters)'
				};
			}

			if (!normalized.startsWith('SELECT')) {
				return { success: false, error: 'Only SELECT queries are allowed' };
			}

			for (const keyword of dangerousKeywords) {
				if (normalized.includes(keyword)) {
					return {
						success: false,
						error: `Blocked dangerous keyword: ${keyword}`
					};
				}
			}

			const results = db.prepare(query).all();
			return { success: true, results, count: results.length };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
};
