import type { ExecutorContext } from '@nrwl/devkit';
import { homedir } from 'os';
import { join } from 'path';
import { Token } from 'typedi';

// TODO: on windows path is _netrc
export const HEROKU_AUTH_FILE = `${join(
  homedir(),
  '.netrc'
)}` as `${string}/.netrc`;
export const HEROKU_MAX_APP_NAME_LENGTH = 30;
export const HEROKU_STACK = 'heroku-22';
export const HEROKU_BUILDPACK_MULTI_PROCFILE =
  'heroku-community/multi-procfile';
export const HEROKU_BUILDPACK_STATIC = 'heroku-community/static';
export const HEROKU_BUILDPACK_APT = 'heroku-community/apt';
export const HEROKU_ENV_VARIABLES_PREFIX = 'HD_';
export const STATIC_JSON = 'static.json';
export const APTFILE = 'Aptfile';
export const PROCFILE = 'Procfile';
export const DEFAULT_GIT_USERNAME = 'Heroku-Deploy';
export const ASCII_COLORS_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export type Environment = 'development' | 'staging' | 'production';
export type HerokuEnvironment = 'dev' | 'staging' | 'prod';

export const EXECUTOR_CONTEXT = new Token<ExecutorContext>('EXECUTOR_CONTEXT');
