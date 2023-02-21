import { logger } from '@nrwl/devkit';

import { exec, parseJsonString } from '../utils';
import { HerokuError } from './error';

export async function getAddons(
  appName: string
): Promise<{ addon_service: { name: string } }[]> {
  const { stdout, stderr } = await exec(`heroku addons -a ${appName} --json`, {
    encoding: 'utf-8',
  });
  if (!stderr) {
    return parseJsonString(stdout);
  }
  logger.warn(HerokuError.cleanMessage(stderr));
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
      // addonPlanName contains service name and plan name separated by :
      const addonName = addonPlanName.split(':').shift();
      const hasAddon = registeredAddons.some(
        (el) => el.addon_service.name === addonName
      );
      if (!hasAddon) {
        // output success to stdout : Your add-on is being provisioned. It will be available shortly ...
        // output sucess to stderr : Creating ${addonPlanName} on ${appName}...
        await exec(
          `heroku addons:create ${addonPlanName} -a ${appName} --as ${addonAlias}`
        );
      }
    });
    await Promise.all(promises);
  }
}
