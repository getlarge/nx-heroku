import { logger } from '@nx/devkit';
import { URL } from 'node:url';
import isURL from 'validator/lib/isURL';

import { exec, parseJsonString } from '../utils';
import { HerokuError, shouldHandleHerokuError } from './error';

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
    { encoding: 'utf-8' }
  );
  if (shouldHandleHerokuError(stderr, stdout)) {
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
  const { appName, drain = null } = options;
  if (!drain?.url || !isURL(drain.url)) return;
  let url: string = drain.url;
  if (drain.user && drain.password) {
    const urlObject = new URL(drain.url);
    urlObject.username = drain.user;
    urlObject.password = drain.password;
    url = urlObject.href;
  }
  const drains = await getDrains(appName);
  if (drains?.length && drains.some((el) => el.url === url)) {
    return 'found';
  }
  // output success to stdout:  Successfully added drain ${drain.url}
  try {
    const { stderr, stdout } = await exec(
      `heroku drains:add ${url} --app ${appName}`
    );
    if (shouldHandleHerokuError(stderr, stdout)) {
      // Warning: heroku update available
      throw new HerokuError(stderr);
    }
    return 'created';
  } catch (e) {
    // for some reason this error happens even though we check if the drain exists before
    // probably because of the "Warning: heroku update available ..." message ?
    if (e.toString().includes('Url has already been taken')) {
      return 'found';
    }
    throw e;
  }
}
