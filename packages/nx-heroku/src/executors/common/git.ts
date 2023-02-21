import { DEFAULT_GIT_USERNAME } from './constants';
import { exec } from './utils';

export async function getGitUserName(): Promise<string> {
  const { stdout, stderr } = await exec(`git config user.name`, {
    encoding: 'utf-8',
  });
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout?.trim() || DEFAULT_GIT_USERNAME;
}

export async function getGitEmail(): Promise<string> {
  const { stdout, stderr } = await exec(`git config user.email`, {
    encoding: 'utf-8',
  });
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout?.trim() || '';
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

export async function getGitRemoteBranch(options: {
  remoteName: string;
}): Promise<string> {
  const { remoteName } = options;
  const { stdout } = await exec(
    `git remote show ${remoteName} | grep 'HEAD' | cut -d':' -f2 | sed -e 's/^ *//g' -e 's/ *$//g'`,
    { encoding: 'utf-8' }
  );
  return stdout?.trim();
}
