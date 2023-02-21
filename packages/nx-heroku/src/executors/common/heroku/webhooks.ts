import { logger } from '@nrwl/devkit';
import isURL from 'validator/lib/isURL';

import { exec, parseTable } from '../utils';
import { HerokuError } from './error';

export async function getWebhooks(
  appName: string
): Promise<{ id: string; url: string; include: string; level: string }[]> {
  const { stdout, stderr } = await exec(`heroku webhooks -a ${appName}`, {
    encoding: 'utf-8',
  });
  if (stderr) {
    logger.warn(HerokuError.cleanMessage(stderr));
    return [];
  }
  const res = parseTable(stdout);
  // remove header from webhooks response
  res.shift();
  return res.map((webhook) => {
    const [id, url, include, level] = webhook.split(' ');
    return { id, url, include, level };
  });
}

// eslint-disable-next-line max-lines-per-function
export async function addWebhook(options: {
  appName: string;
  webhook?: {
    url: string;
    include: string[];
    level: string;
    secret?: string;
  };
}): Promise<'created' | 'updated' | 'found'> {
  const {
    appName,
    webhook = {
      url: '',
      include: ['api:build', 'api:release', 'dyno'],
      level: 'sync',
      secret: '',
    },
  } = options;
  if (!webhook?.url || !isURL(webhook.url)) return;
  const { url, level, secret } = webhook;
  const include = webhook.include.join(',');
  const webhooks = await getWebhooks(appName);
  const sameWebhookEndpoint = webhooks.find((hook) => hook.url === url);
  if (!sameWebhookEndpoint) {
    // output success to stderr : Adding webhook to ${appName}... done
    await exec(
      `heroku webhooks:add -u ${url} -i ${include} -l ${level} -s ${secret} -a ${appName}`
    );
    return 'created';
  } else if (
    sameWebhookEndpoint.id &&
    (sameWebhookEndpoint.include !== include ||
      sameWebhookEndpoint.level !== level)
  ) {
    // output success to stderr : Updating webhook ${sameWebhookEndpoint.id} for ${appName}... done
    await exec(
      `heroku webhooks:update ${sameWebhookEndpoint.id} -u ${url} -i ${include} -l ${level} -s ${secret} -a ${appName}`
    );
    return 'updated';
  }
  return 'found';
}
