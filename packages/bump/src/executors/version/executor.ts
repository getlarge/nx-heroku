import type { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { VersionExecutorSchema } from './schema';

export default async function runExecutor(
  options: VersionExecutorSchema,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const { type } = options;
  console.info(`Bumping version for ${context.projectName} to ${type} ...`);
  const libsDir =
    context.nxJsonConfiguration?.workspaceLayout?.libsDir ?? 'packages';
  execSync(`npm --prefix=${libsDir}/${context.projectName} version ${type}`, {
    stdio: [process.stdin, process.stdout, 'pipe'],
    cwd: context.root,
  });

  return { success: true };
}
