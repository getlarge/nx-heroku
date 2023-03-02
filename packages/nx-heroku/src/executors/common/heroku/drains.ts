import { logger } from '@nrwl/devkit';
import { URL } from 'url';
import isURL from 'validator/lib/isURL';

import { exec, parseJsonString } from '../utils';
import { HerokuError } from './error';

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
  const { stdout, stderr } = await exec(
    `heroku drains --app ${appName} --json`,
    {
      encoding: 'utf-8',
    }
  );
  if (stderr) {
    logger.warn(HerokuError.cleanMessage(stderr));
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
  // output success to stdout:  Successfully added drain ${drain.url}
  const { stderr } = await exec(`heroku drains:add ${url} --app ${appName}`);
  if (stderr) {
    throw new HerokuError(stderr);
  }
  return 'created';
}
