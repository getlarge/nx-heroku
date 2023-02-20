import type { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';

export interface RunCommandsOptions {
  version:
    | 'major'
    | 'minor'
    | 'patch'
    | 'premajor'
    | 'preminor'
    | 'prepatch'
    | 'prerelease'
    | 'from-git';
}

export default function runCommands(
  options: RunCommandsOptions,
  context: ExecutorContext
): { success: boolean } {
  console.info(`Bumping version for ${context.projectName}...`);
  const { version } = options;
  const libsDir =
    context.nxJsonConfiguration?.workspaceLayout?.libsDir ?? 'packages';
  execSync(
    `npm --prefix=${libsDir}/${context.projectName} version ${version}`,
    { stdio: [process.stdin, process.stdout, 'pipe'], cwd: context.root }
  );

  return { success: true };
}
