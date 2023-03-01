import {
  getProjects,
  TargetConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';

import { GeneratorSchema } from './schema';

export type TargetName = 'deploy' | 'promote';

function createTargetOptions(
  options: GeneratorSchema
): TargetConfiguration['options'] {
  const targetOptions: (keyof GeneratorSchema)[] = [
    'appNamePrefix',
    'repositoryName',
    'org',
    'apiKey',
    'email',
    'debug',
  ];

  return targetOptions
    .filter((key) => Boolean(options[key]))
    .reduce(
      (targetOptions, key) => ({
        ...targetOptions,
        [key]: options[key],
      }),
      {}
    );
}

function createTarget(
  options: GeneratorSchema,
  targetName: TargetName
): TargetConfiguration {
  const targetOptions = createTargetOptions(options);
  return {
    executor: `@aloes/nx-heroku:${targetName}`,
    ...(Object.keys(targetOptions).length > 0
      ? { options: targetOptions }
      : {}),
  };
}

export function updateProjects(
  tree: Tree,
  options: GeneratorSchema,
  targetName: TargetName
) {
  getProjects(tree).forEach((project, projectName) => {
    if (projectName === options.projectName) {
      const targets = project.targets ?? {};
      targets[targetName] = createTarget(options, targetName);
      updateProjectConfiguration(tree, projectName, { ...project, targets });
    }
  });
}
