import { exec as cbBasedExec, ExecException } from 'child_process';
import { expand } from 'dotenv-expand';
import { cloneDeep, isString, merge, pickBy } from 'lodash';
import { promisify } from 'util';

import { ASCII_COLORS_REGEX } from './constants';

export const exec = promisify(cbBasedExec);

export function removeConsoleOutputColors(stdout: string) {
  return stdout?.trim()?.replace(ASCII_COLORS_REGEX, '')?.trim();
}

export function parseJsonString(stdout: string) {
  return JSON.parse(removeConsoleOutputColors(stdout));
}

export function parseTable(stdout: string) {
  const lines = removeConsoleOutputColors(stdout)?.split('\n');
  // remove header from response
  lines.shift();
  return lines;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// TODO: refactor to be more performant and efficient, running expand on each object option is (probably) not really efficient
export function expandOptions<O extends object>(options: O): O {
  // iterate over 1 nested level objects
  const parsedNested = Object.entries(options).reduce((acc, curr) => {
    const [key, value] = curr;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const { parsed } = expand({ parsed: pickBy(value, isString) });
      // cleanup process.env to counter `expand` side effect which assigns `parsed` value on process.env
      Object.keys(parsed).forEach((k) => delete process.env[k]);
      const res = { ...value, ...parsed };
      acc[key] = res;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
  const { parsed } = expand({ parsed: pickBy(parsedNested, isString) });
  return merge(cloneDeep(options), parsedNested, parsed);
}

export function isExecException(error: unknown): error is ExecException {
  return (error as ExecException).code !== undefined;
}
