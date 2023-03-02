import { DEFAULT_GIT_USERNAME } from './constants';
import { ConsoleLogger } from './logger';
import { exec } from './utils';

export async function getGitUserParam(
  key: 'email' | 'name',
  defaultValue?: string
): Promise<string> {
  try {
    const { stdout, stderr } = await exec(`git config user.${key}`, {
      encoding: 'utf-8',
    });
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout?.trim() || defaultValue;
  } catch (e) {
    ConsoleLogger.error(e);
    return defaultValue;
  }
}

export function getGitUserName(): Promise<string> {
  return getGitUserParam('name', DEFAULT_GIT_USERNAME);
}

export function getGitEmail(): Promise<string> {
  return getGitUserParam('email', '');
}

export async function setGitUserParam(
  key: 'name' | 'email',
  value: string
): Promise<void> {
  const { stderr } = await exec(`git config user.${key} "${value}"`, {
    encoding: 'utf-8',
  });
  if (stderr) {
    throw new Error(stderr);
  }
}

export function setGitEmail(email: string): Promise<void> {
  return setGitUserParam('email', email);
}

export function setGitUserName(name: string): Promise<void> {
  return setGitUserParam('name', name);
}

export async function getGitLocalBranchName(): Promise<string> {
  // initially we used 'git rev-parse --abbrev-ref HEAD', see https://stackoverflow.com/questions/6245570/how-do-i-get-the-current-branch-name-in-git
  const { stdout, stderr } = await exec('git symbolic-ref --short HEAD', {
    encoding: 'utf-8',
  });
  if (stderr) {
    ConsoleLogger.warn(stderr);
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
