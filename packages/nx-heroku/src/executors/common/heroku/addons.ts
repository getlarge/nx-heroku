import { logger } from '@nrwl/devkit';

import { exec, parseJsonString } from '../utils';
import { HerokuError, shouldHandleHerokuError } from './error';

export async function getAddons(
  appName: string
): Promise<{ addon_service: { name: string } }[]> {
  const { stdout, stderr } = await exec(
    `heroku addons --app ${appName} --json`,
    { encoding: 'utf-8' }
  );
  if (!stderr) {
    return parseJsonString(stdout);
  }
  logger.warn(HerokuError.cleanMessage(stderr));
  return [];
}

export async function addAddon(options: {
  appName: string;
  addonAlias?: string;
  addonName: string;
}) {
  const { addonAlias, addonName, appName } = options;
  const baseCommand = `heroku addons:create ${addonName} --app ${appName}`;
  const command = addonAlias
    ? `${baseCommand} --as ${addonAlias}`
    : baseCommand;
  // output success to stdout : Your add-on is being provisioned. It will be available shortly ...
  // output sucess to stderr : Creating ${addonName} on ${appName}...
  try {
    const { stderr, stdout } = await exec(command);
    if (shouldHandleHerokuError(stderr, stdout)) {
      logger.warn(HerokuError.cleanMessage(stderr));
    }
  } catch (e) {
    logger.warn(e);
  }
}

export async function addAddons(options: {
  appName: string;
  addons?: { addonAlias?: string; addonName: string }[];
}): Promise<void> {
  const { addons = [], appName } = options;
  if (addons?.length) {
    const registeredAddons = await getAddons(appName);
    for (const addon of addons) {
      const { addonName: addonPlanName } = addon;
      // addonPlanName contains service name and plan name separated by :
      const addonName = addonPlanName.split(':').shift();
      const hasAddon = registeredAddons.some(
        (el) => el.addon_service.name === addonName
      );
      if (!hasAddon) {
        await addAddon({ ...addon, appName });
      }
    }
  }
}
