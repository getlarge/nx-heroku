import { DEFAULT_GIT_USERNAME } from './constants';
import { exec } from './utils';

export async function getGitUserName(): Promise<string> {
  const { stdout, stderr } = await exec(`git config user.name`, {
    encoding: 'utf-8',
  });
  return stderr ? DEFAULT_GIT_USERNAME : stdout?.trim() || DEFAULT_GIT_USERNAME;
}

export async function getGitLocalBranchName(): Promise<string> {
  const { stdout, stderr } = await exec('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf-8',
  });
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout?.trim();
}
