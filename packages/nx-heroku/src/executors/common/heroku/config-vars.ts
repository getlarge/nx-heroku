import { fromPairs } from 'lodash';

import { HEROKU_ENV_VARIABLES_PREFIX } from '../constants';
import { exec, parseTable } from '../utils';

export type ConfigVarQuote = `'` | `"`;

export type SerializedConfigVar =
  `${string}=${ConfigVarQuote}${string}${ConfigVarQuote}`;

export type Variables = Record<string, string>;

export async function getConfigVars(options: {
  appName: string;
}): Promise<Record<string, string>> {
  const { appName } = options;
  const { stdout: configVars } = await exec(`heroku config --app ${appName}`, {
    encoding: 'utf-8',
  });
  const rawAppEnv = parseTable(configVars) || [];
  if (rawAppEnv.includes(`Invalid credentials provided`)) {
    throw new Error('Invalid credentials provided');
  }
  return rawAppEnv.reduce((acc, line) => {
    const parts = line.split(':');
    const key = parts.shift().trim();
    const value = parts.map((el) => el.trim()).join(':');
    if (key && value) acc[key] = value;
    return acc;
  }, {});
}

export function serializeConfigVar(
  key: string,
  value: string,
  quote: ConfigVarQuote = `'`
): SerializedConfigVar {
  return `${key}=${quote}${value}${quote}`;
}

export function serializeConfigVars(
  variables: Variables,
  quote: ConfigVarQuote = `'`
): SerializedConfigVar[] {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    acc.push(serializeConfigVar(key, value, quote));
    return acc;
  }, []);
}

export async function setConfigVars(options: {
  appName: string;
  configVars: SerializedConfigVar[];
}): Promise<Variables> {
  const { appName, configVars = [] } = options;
  if (configVars.length > 0) {
    // outputs variables set to stdout  key1: value1 \n key2: value2
    // outputs success message to stderr  Setting <configVars keys comma separated> and restarting ${appName}...
    const { stdout = '' } = await exec(
      `heroku config:set --app ${appName} ${configVars.join(' ')}`
    );
    const updatedConfigVarsMatrix = stdout
      .trim()
      .split('\n')
      .map((line) =>
        line
          .trim()
          .split(':')
          .map((el) => el.trim())
      );
    return fromPairs(updatedConfigVarsMatrix);
  }
  return undefined;
}

function addConfigVars(
  variables: Variables,
  source: Variables,
  options: {
    excludeKeys?: string[];
    prefix?: string;
    update?: boolean;
  }
): SerializedConfigVar[] {
  const { excludeKeys = [], update, prefix } = options;
  const configVars: SerializedConfigVar[] = [];

  function shouldInsert(key: string): boolean {
    return !(key in source) || (source[key] !== variables[key] && update);
  }

  for (let key in variables) {
    if (excludeKeys.includes(key)) continue;
    if (prefix && !key.startsWith(prefix)) continue;
    const newValue = variables[key];
    key = prefix ? key.substring(prefix.length) : key;
    if (shouldInsert(key)) {
      configVars.push(serializeConfigVar(key, newValue));
    }
  }
  return configVars;
}

/*
 * check existing config variables to only push changed or new variables
 */
export async function mergeConfigVars(options: {
  appName: string;
  variables?: Variables;
  excludeKeys?: string[];
  update?: boolean;
}): Promise<Variables> {
  const { appName, variables = {}, excludeKeys = [], update } = options;
  const currentConfigVars = await getConfigVars(options);
  let configVars: SerializedConfigVar[] = [];
  configVars = [
    ...addConfigVars(process.env, currentConfigVars, {
      excludeKeys,
      prefix: HEROKU_ENV_VARIABLES_PREFIX,
      update,
    }),
  ];
  configVars = [
    ...configVars,
    ...addConfigVars(variables, currentConfigVars, {
      excludeKeys,
      update,
    }),
  ];
  return setConfigVars({ appName, configVars });
}
