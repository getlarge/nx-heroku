import { exec } from '../utils';

export async function clearBuildPacks(options: { appName: string }) {
  const { appName } = options;
  // stdout contains : Buildpacks cleared. Next release on <appName> will detect buildpacks normally.
  await exec(`heroku buildpacks:clear --app ${appName}`);
}

export async function addBuildPack(options: {
  appName: string;
  buildPack: string;
  index: number;
}) {
  const { appName, buildPack, index } = options;
  // stdout contains : Buildpack added. Next release on <appName> will use <buildPack>.
  await exec(
    `heroku buildpacks:add ${buildPack} --app ${appName} --index ${index}`
  );
}
