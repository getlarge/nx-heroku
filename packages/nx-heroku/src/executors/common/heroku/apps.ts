import { logger } from '@nrwl/devkit';
import { ExecException } from 'child_process';

import {
  Environment,
  HEROKU_MAX_APP_NAME_LENGTH,
  HEROKU_STACK,
  HerokuEnvironment,
} from '../constants';
import { exec } from '../utils';
import { HerokuError } from './error';

export type AppName =
  | `${string}-${HerokuEnvironment}`
  | `${string}-${string}-${HerokuEnvironment}`;

export const getEnvName = (options: {
  environment: Environment;
}): HerokuEnvironment => {
  const { environment } = options;
  if (environment === 'production') {
    return 'prod';
  } else if (environment === 'development') {
    return 'dev';
  }
  return environment;
};

export function getAppName(options: {
  appNamePrefix?: string;
  environment: Environment;
  projectName: string;
  debug?: boolean;
}): AppName {
  const { appNamePrefix = '', environment, projectName, debug } = options;
  const env = getEnvName({ environment });
  let appName: AppName = appNamePrefix
    ? `${appNamePrefix}-${projectName}-${env}`
    : `${projectName}-${env}`;
  if (appName.length > HEROKU_MAX_APP_NAME_LENGTH) {
    const extraLength = appNamePrefix.length + env.length + 2;
    const maxNameLength = HEROKU_MAX_APP_NAME_LENGTH - extraLength;
    const shortenProjectName = projectName.substring(0, maxNameLength);
    if (debug) {
      logger.warn(`Project name has been shorten to : ${shortenProjectName}`);
    }
    appName = `${appNamePrefix}-${shortenProjectName}-${env}`;
  }
  return appName;
}

export function getRemoteName(appName: string): `heroku-${string}` {
  return `heroku-${appName}`;
}

export async function appExists(options: {
  appName: string;
}): Promise<boolean> {
  try {
    // check if appName exists, throws an error if it doesn't
    const { stderr } = await exec(`heroku apps:info --app ${options.appName}`, {
      encoding: 'utf-8',
    });
    if (stderr) {
      logger.warn(stderr);
      return false;
    }
    return true;
  } catch (e) {
    const ex = e as ExecException;
    logger.warn(ex.message);
    return false;
  }
}

export async function createApp(options: {
  appName: string;
  remoteName: string;
  org?: string;
  region?: string;
}): Promise<{ stdout: string; stderr: string }> {
  const { appName, remoteName, org, region = 'eu' } = options;
  // outputs on success to stderr : Creating ${appName}... done, region is ${region}, stack is ${HEROKU_STACK}
  // outputs on success to stdout : https://<app-name>.herokuapp.com/ | https://git.heroku.com/<app-name>.git
  const baseCommand = `heroku apps:create ${appName} --remote ${remoteName} --region ${region} --stack ${HEROKU_STACK}`;
  const command = org ? `${baseCommand} --team ${org}` : baseCommand;
  return exec(command, { encoding: 'utf-8' });
}

export async function createAppRemote(options: {
  appName: string;
  remoteName: string;
}): Promise<void> {
  const { appName, remoteName } = options;
  try {
    await exec(`heroku git:remote --app ${appName} --remote ${remoteName}`, {
      encoding: 'utf-8',
    });
  } catch (error) {
    // TODO: catch error when gitconfig could not be locked that occurs during parallel deployment
    const ex = error as ExecException;
    if (ex.toString().includes("Couldn't find that app")) {
      throw new HerokuError(`Couldn't find that app. ${error.toString()}`);
    }
    throw error;
  }
}
