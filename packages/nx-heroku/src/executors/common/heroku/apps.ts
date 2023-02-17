import { logger } from '@nrwl/devkit';

import {
  Environment,
  HEROKU_MAX_APP_NAME_LENGTH,
  HEROKU_STACK,
  HerokuEnvironment,
} from '../constants';
import { exec, parseJsonString } from '../utils';

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
  verbose?: boolean;
}): AppName {
  const { appNamePrefix = '', environment, projectName, verbose } = options;
  const env = getEnvName({ environment });
  let appName: AppName = appNamePrefix
    ? `${appNamePrefix}-${projectName}-${env}`
    : `${projectName}-${env}`;
  if (appName.length > HEROKU_MAX_APP_NAME_LENGTH) {
    const extraLength = appNamePrefix.length + env.length + 2;
    const maxNameLength = HEROKU_MAX_APP_NAME_LENGTH - extraLength;
    const shortenProjectName = projectName.substring(0, maxNameLength);
    if (verbose) {
      logger.warn(`Project name has been shorten to : ${shortenProjectName}`);
    }
    appName = `${appNamePrefix}-${shortenProjectName}-${env}`;
  }
  return appName;
}

export function getRemoteName(appName: string): string {
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
}) {
  const pipelineName = getPipelineName(options);
  // capture pipelines list and remove ANSI styles
  const { stdout, stderr } = await exec(`heroku pipelines --json`, {
    encoding: 'utf-8',
  });
  stderr && logger.error(new Error(stderr));
  const pipelines = parseJsonString(stdout).map((pipeline) => pipeline.name);
  return pipelines.includes(pipelineName);
}

export async function appExists(options: {
  appName: string;
}): Promise<boolean> {
  try {
    // check if appName exists, throws an error if it doesn't
    const { stderr } = await exec(`heroku apps:info -a ${options.appName}`, {});
    if (stderr) {
      logger.error(new Error(stderr));
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
}): Promise<string> {
  const { appName, remoteName, org } = options;
  const { stdout, stderr } = await exec(
    `heroku create ${appName} --remote ${remoteName} --region eu --stack ${HEROKU_STACK} --team ${org}`,
    { encoding: 'utf-8' }
  );
  stderr && logger.error(new Error(stderr));
  return stdout;
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
  stderr && logger.error(new Error(stderr));
}
