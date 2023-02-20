import { exec } from '../utils';
import { AppName } from './apps';

export async function dynoCommand(options: {
  command: 'kill' | 'restart' | 'stop';
  appName: AppName;
}) {
  const { appName, command } = options;
  const { stdout, stderr } = await exec(
    `heroku dyno:${command} -a ${appName}`,
    { encoding: 'utf-8' }
  );
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}

export * from './addons';
export * from './apps';
export * from './auth';
export * from './config-vars';
export * from './drains';
export * from './members';
export * from './webhooks';
