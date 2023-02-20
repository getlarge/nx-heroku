import { rm } from 'fs/promises';
import isEmail from 'validator/lib/isEmail';
import isUUID from 'validator/lib/isUUID';

import { exec } from '../utils';

export async function createCatFile(options: {
  email: string;
  apiKey: string;
}): Promise<void> {
  const { email, apiKey } = options;
  if (!isEmail(email)) {
    throw new TypeError(`email (${email}) is not valid.`);
  }
  if (!isUUID(apiKey)) {
    throw new TypeError(`apiKey (${apiKey}) is not valid.`);
  }
  await exec(`cat >~/.netrc <<EOF
    machine api.heroku.com
        login ${email}
        password ${apiKey}
    machine git.heroku.com
        login ${email}
        password ${apiKey}
    EOF`);
}

export async function removeCatFile(): Promise<void> {
  try {
    await rm('~/.netrc');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}
