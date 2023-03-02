import { exec } from '../utils';

export async function getPlugins(): Promise<string[]> {
  const { stdout } = await exec('heroku plugins', { encoding: 'utf8' });
  return stdout
    .trim()
    .split('\n')
    .map((line) => line.trim().split(' ')[0]);
}

export async function hasPlugin(plugin: string): Promise<boolean> {
  const list = await getPlugins();
  return list.includes(plugin);
}

export async function installPlugin(plugin: string): Promise<void> {
  await exec(`heroku plugins:install ${plugin}`);
}
