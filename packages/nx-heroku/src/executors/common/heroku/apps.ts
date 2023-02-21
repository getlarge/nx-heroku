import { logger } from '@nrwl/devkit';

import {
  Environment,
  HEROKU_MAX_APP_NAME_LENGTH,
  HEROKU_STACK,
  HerokuEnvironment,
} from '../constants';
import { exec, parseJsonString } from '../utils';
import { HerokuError } from './error';

export type AppName =
  | `${string}-${HerokuEnvironment}`
  | `${string}-${string}-${HerokuEnvironment}`;

// PIPELINE AND APPS
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

export function getPipelineName(options: {
  appNamePrefix?: string;
  projectName: string;
}): string {
  const { appNamePrefix, projectName } = options;
  return appNamePrefix ? `${appNamePrefix}-${projectName}` : projectName;
}

export function getPipelineUpstream(environment: Environment): Environment {
  if (environment === 'development') {
    return 'staging';
  } else if (environment === 'staging') {
    return 'production';
  }
  throw TypeError(
    'Heroku can only promote apps from development and staging environments.'
  );
}

export function getPipelineDownstream(environment: Environment): Environment {
  if (environment === 'staging') {
    return 'development';
  } else if (environment === 'production') {
    return 'staging';
  }
  throw TypeError(
    'Heroku can only promote apps from development and staging environments.'
  );
}

export async function pipelineExists(options: {
  appNamePrefix?: string;
  projectName: string;
}): Promise<boolean> {
  const pipelineName = getPipelineName(options);
  // capture pipelines list and remove ANSI styles
  const { stdout, stderr } = await exec(`heroku pipelines --json`, {
    encoding: 'utf-8',
  });
  stderr && logger.error(new HerokuError(stderr));
  const pipelines = parseJsonString(stdout).map((pipeline) => pipeline?.name);
  return pipelines.includes(pipelineName);
}

export async function appExists(options: {
  appName: string;
}): Promise<boolean> {
  try {
    // check if appName exists, throws an error if it doesn't
    const { stderr } = await exec(`heroku apps:info -a ${options.appName}`, {
      encoding: 'utf-8',
    });
    if (stderr) {
      logger.warn(stderr);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function createApp(options: {
  appName: string;
  remoteName: string;
  org: string;
  region?: string;
}): Promise<{ stdout: string; stderr: string }> {
  const { appName, remoteName, org, region = 'eu' } = options;
  // outputs on success to stderr : Creating ${appName}... done, region is ${region}, stack is ${HEROKU_STACK}
  // outputs on success to stdout : https://<app-name>.herokuapp.com/ | https://git.heroku.com/<app-name>.git
  return exec(
    `heroku create ${appName} --remote ${remoteName} --region ${region} --stack ${HEROKU_STACK} --team ${org}`,
    { encoding: 'utf-8' }
  );
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
    if (error.toString().includes("Couldn't find that app")) {
      throw new HerokuError(`Couldn't find that app. ${error.toString()}`);
    }
    throw error;
  }
}

export async function createPipeline(options: {
  appName: string;
  pipelineName: string;
  environment: Environment;
  org: string;
}): Promise<void> {
  const { appName, environment, org, pipelineName } = options;
  await exec(
    `heroku pipelines:create ${pipelineName} --app ${appName} --stage ${environment} --team ${org}`
  );
}

export async function addAppToPipeline(options: {
  appName: string;
  pipelineName: string;
  environment: Environment;
}): Promise<void> {
  const { appName, pipelineName, environment } = options;
  const { stderr } = await exec(
    `heroku pipelines:add ${pipelineName} --app ${appName} --stage ${environment}`,
    { encoding: 'utf-8' }
  );
  stderr && logger.warn(HerokuError.cleanMessage(stderr));
}

export async function promoteApp(options: {
  appNamePrefix?: string;
  projectName: string;
  environment: Environment;
  debug?: boolean;
}): Promise<string> {
  const { appNamePrefix, projectName, environment, debug } = options;
  const sourceEnv = getPipelineDownstream(environment);
  const sourceAppName = getAppName({
    appNamePrefix,
    projectName,
    environment: sourceEnv,
    debug,
  });
  const appName = getAppName({
    appNamePrefix,
    projectName,
    environment,
    debug,
  });
  // outputs on success to stdout : Fetching app info... \n Fetching apps from ${pipeline}..
  const { stdout, stderr } = await exec(
    `heroku pipelines:promote --app ${sourceAppName} --to ${appName}`
  );
  stderr && logger.warn(HerokuError.cleanMessage(stderr));
  return stdout;
}
