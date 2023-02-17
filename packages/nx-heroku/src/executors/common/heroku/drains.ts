import { logger } from '@nrwl/devkit';
import isURL from 'validator/lib/isURL';
import { URL } from 'url';

import { exec, parseJsonString } from '../utils';

export async function getDrains(appName: string): Promise<
  {
    addon: string | null;
    created_at: string;
    id: string;
    token: string;
    updated_at: string;
    url: string;
  }[]
> {
  const { stdout, stderr } = await exec(`heroku drains -a ${appName} --json`, {
    encoding: 'utf-8',
  });
  if (stderr) {
    logger.warn(stderr);
    return [];
  }
  return parseJsonString(stdout);
}

export async function addDrain(options: {
  appName: string;
  drain?: {
    url: string;
    user?: string;
    password?: string;
  };
}): Promise<'found' | 'created'> {
  const { appName, drain = { url: '' } } = options;
  if (!drain?.url || !isURL(drain.url)) return;
  let url: string = drain.url;
  if (drain.user && drain.password) {
    const urlObject = new URL(drain.url);
    urlObject.username = drain.user;
    urlObject.password = drain.password;
    url = urlObject.href;
  }

  const drains = await getDrains(appName);
  if (drains?.length && drains.find((el) => el.url === url)) {
    return 'found';
  }
  const { stderr } = await exec(`heroku drains:add ${url} -a ${appName}`);
  if (stderr) {
    throw new Error(stderr);
  }
  return 'created';
}
