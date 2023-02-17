import { logger } from '@nrwl/devkit';

import { exec, parseJsonString } from '../utils';

export async function getAddons(
  appName: string
): Promise<{ addon_service: { name: string } }[]> {
  const { stdout, stderr } = await exec(`heroku addons -a ${appName} --json`, {
    encoding: 'utf-8',
  });
  if (!stderr) {
    return parseJsonString(stdout);
  }
  logger.warn(stderr);
  return [];
}

export async function addAddons(options: {
  appName: string;
  addons?: { addonAlias?: string; addonName: string }[];
}): Promise<void> {
  const { addons = [], appName } = options;
  if (addons?.length) {
    const registeredAddons = await getAddons(appName);

    const promises = addons.map(async (addon) => {
      const { addonAlias, addonName: addonPlanName } = addon;
      const addonName = addonPlanName.split(':').shift();
      const hasAddon = registeredAddons.some(
        (el) => el.addon_service.name === addonName
      );
      if (!hasAddon) {
        const { stderr } = await exec(
          `heroku addons:create ${addonPlanName} -a ${appName} --as ${addonAlias}`
        );
        if (stderr) {
          throw new Error(stderr);
        }
      }
    });

    await Promise.all(promises);
  }
}
