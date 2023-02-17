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
  const { stdout: configVars } = await exec(`heroku config --app=${appName}`, {
    encoding: 'utf-8',
  });
  const rawAppEnv = parseTable(configVars) || [];
  if (rawAppEnv.includes(`Invalid credentials provided`)) {
    throw new Error('Invalid credentials provided');
  }
  rawAppEnv.shift();
  return rawAppEnv.reduce((acc, line) => {
    const parts = line.split(':');
    const key = parts.shift().trim();
    const value = parts.map((el) => el.trim()).join(':');
    acc[key] = value;
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

export function addConfigVars(
  variables: Variables,
  source: Variables,
  excludeKeys: string[] = [],
  prefix?: string
): SerializedConfigVar[] {
  const configVars: SerializedConfigVar[] = [];
  for (const key in variables) {
    if (excludeKeys.includes(key)) continue;
    const newValue = variables[key];
    if (prefix && key.startsWith(prefix)) {
      const newKey = key.substring(prefix.length);
      if (!(newKey in source) || source[newKey] !== newValue) {
        configVars.push(serializeConfigVar(newKey, newValue));
      }
    } else if (!prefix && !(key in source)) {
      configVars.push(serializeConfigVar(key, newValue));
    }
  }
  return configVars;
}

export async function setConfigVars(options: {
  appName: string;
  configVars: SerializedConfigVar[];
}): Promise<void> {
  const { appName, configVars = [] } = options;
  if (configVars.length > 0) {
    const { stderr } = await exec(
      `heroku config:set --app=${appName} ${configVars.join(' ')}`
    );
    if (stderr) {
      throw new Error(stderr);
    }
  }
}

/*
 * check existing config variables to only push changed or new variables
 */
export async function mergeConfigVars(options: {
  appName: string;
  variables?: Variables;
  excludeKeys?: string[];
}): Promise<void> {
  const { appName, variables = {}, excludeKeys = [] } = options;
  const currentConfigVars = await getConfigVars(options);
  let configVars: SerializedConfigVar[] = [];
  configVars = [
    ...configVars,
    ...addConfigVars(
      process.env,
      currentConfigVars,
      excludeKeys,
      HEROKU_ENV_VARIABLES_PREFIX
    ),
  ];
  configVars = [
    ...configVars,
    ...addConfigVars(variables, currentConfigVars, excludeKeys),
  ];
  await setConfigVars({ appName, configVars });
}
