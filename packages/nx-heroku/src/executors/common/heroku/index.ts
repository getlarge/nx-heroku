import { exec } from '../utils';
import { AppName } from './apps';

export async function dynoCommand(options: {
  command: 'kill' | 'restart' | 'stop' | 'scale';
  appName: AppName;
}) {
  const { appName, command } = options;
  const { stderr } = await exec(`heroku dyno:${command} -a ${appName}`, {
    encoding: 'utf-8',
  });
  // nothing is sent to stdout even success message
  return stderr;
}

export * from './addons';
export * from './apps';
export * from './auth';
export * from './buildpacks';
export * from './config-vars';
export * from './drains';
export * from './error';
export * from './members';
export * from './pipelines';
export * from './plugins';
export * from './webhooks';
