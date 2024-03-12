import { logger } from '@nx/devkit';
import isURL from 'validator/lib/isURL';
import isUUID from 'validator/lib/isUUID';

import { exec, parseTable } from '../utils';
import { HerokuError, shouldHandleHerokuError } from './error';

export type Webhook = {
  id: string;
  url: string;
  include: string;
  level: string;
};

export function parseWebhooksTable(table: string[]): Webhook[] {
  /** key order matters */
  const validators = {
    id: isUUID,
    url: isURL,
    include: () => true,
    level: (x?: string) => !x || ['sync', 'notify'].includes(x),
  };
  return table
    .map((webhook) => {
      const parts = webhook.split(' ');
      const webhookIsValid =
        parts.length === 4 &&
        Object.entries(validators).every(([key, validator], i) => {
          if (validator(parts[i])) {
            return true;
          }
          logger.warn(`Invalid ${key} (${parts[i]}) for webhook ${webhook}`);
          return false;
        });
      if (!webhookIsValid) return null;
      const [id, url, include, level] = parts;
      return { id, url, include, level };
    })
    .filter(Boolean);
}

export async function getWebhooks(appName: string): Promise<Webhook[]> {
  const { stdout, stderr } = await exec(`heroku webhooks --app ${appName}`, {
    encoding: 'utf-8',
  });
  if (shouldHandleHerokuError(stderr, stdout)) {
    logger.warn(HerokuError.cleanMessage(stderr));
    return [];
  }

  const table = parseTable(stdout);
  return parseWebhooksTable(table);
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

  const baseCommandParameters = `--app ${appName} --url ${url} --include "${include}" --level ${level}`;
  const commandParameters = secret
    ? `${baseCommandParameters} --secret "${secret}"`
    : baseCommandParameters;

  if (!sameWebhookEndpoint) {
    // output success to stderr : Adding webhook to ${appName}... done
    await exec(`heroku webhooks:add ${commandParameters}`);
    return 'created';
  } else if (
    sameWebhookEndpoint.id &&
    (sameWebhookEndpoint.include !== include ||
      sameWebhookEndpoint.level !== level)
  ) {
    // output success to stderr : Updating webhook ${sameWebhookEndpoint.id} for ${appName}... done
    await exec(
      `heroku webhooks:update ${sameWebhookEndpoint.id} ${commandParameters}`
    );
    return 'updated';
  }
  return 'found';
}
