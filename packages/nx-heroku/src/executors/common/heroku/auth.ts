import { rm, writeFile } from 'node:fs/promises';
import isEmail from 'validator/lib/isEmail';
import isUUID from 'validator/lib/isUUID';

import { HEROKU_AUTH_FILE } from '../constants';

export async function createNetRcFile(options: {
  email: string;
  apiKey: string;
}): Promise<void> {
  const { email, apiKey } = options;
  if (!isEmail(email)) {
    throw new TypeError(`email (${email}) is not a valid email.`);
  }
  if (!isUUID(apiKey)) {
    throw new TypeError(`apiKey (${apiKey}) is not a valid UUID.`);
  }
  const content = `
machine api.heroku.com
  login ${email}
  password ${apiKey}
machine git.heroku.com
  login ${email}
  password ${apiKey}`;

  await writeFile(HEROKU_AUTH_FILE, content);
}

export async function removeNetRcFile(): Promise<void> {
  try {
    await rm(HEROKU_AUTH_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}
