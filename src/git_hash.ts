import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getGitCommit(): Promise<string> {
	try {
		const { stdout } = await execAsync('git rev-parse --short HEAD');
		return stdout.trim();
	} catch (error) {
		console.error(`Error executing git command: ${error}`);
		throw new Error(`Failed to get git commit: ${error}`);
	}
}
