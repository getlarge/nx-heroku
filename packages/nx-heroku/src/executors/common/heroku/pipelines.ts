import { logger } from '@nx/devkit';

import { Environment } from '../constants';
import { exec, parseJsonString } from '../utils';
import { getAppName } from './apps';
import { HerokuError, shouldHandleHerokuError } from './error';

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
  shouldHandleHerokuError(stderr, stdout) &&
    logger.error(new HerokuError(stderr));
  const pipelines = parseJsonString(stdout).map((pipeline) => pipeline?.name);
  return pipelines.includes(pipelineName);
}

export async function createPipeline(options: {
  appName: string;
  pipelineName: string;
  environment: Environment;
  org?: string;
}): Promise<void> {
  const { appName, environment, org, pipelineName } = options;
  const baseCommand = `heroku pipelines:create ${pipelineName} --app ${appName} --stage ${environment}`;
  const command = org ? `${baseCommand} --team ${org}` : baseCommand;
  await exec(command);
}

export async function addAppToPipeline(options: {
  appName: string;
  pipelineName: string;
  environment: Environment;
}): Promise<void> {
  const { appName, pipelineName, environment } = options;
  const { stderr, stdout } = await exec(
    `heroku pipelines:add ${pipelineName} --app ${appName} --stage ${environment}`,
    { encoding: 'utf-8' }
  );
  shouldHandleHerokuError(stderr, stdout) &&
    logger.warn(HerokuError.cleanMessage(stderr));
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
  shouldHandleHerokuError(stderr, stdout) &&
    logger.warn(HerokuError.cleanMessage(stderr));
  return stdout;
}
