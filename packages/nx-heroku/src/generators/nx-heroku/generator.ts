import {
  getProjects,
  TargetConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { NxHerokuGeneratorSchema } from './schema';

function createTargetOptions(
  options: NxHerokuGeneratorSchema
): TargetConfiguration['options'] {
  const targetOptions: (keyof NxHerokuGeneratorSchema)[] = [
    'appNamePrefix',
    'repositoryName',
    'org',
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

function createTarget(options: NxHerokuGeneratorSchema): TargetConfiguration {
  const targetOptions = createTargetOptions(options);
  return {
    executor: '@aloes/nx-heroku:deploy',
    ...(Object.keys(targetOptions).length > 0
      ? { options: targetOptions }
      : {}),
  };
}

function updateProjects(
  tree: Tree,
  options: NxHerokuGeneratorSchema,
  predicate: (projectName: string) => boolean
) {
  getProjects(tree).forEach((project, projectName) => {
    if (predicate(projectName)) {
      const targets = project.targets ?? {};
      targets.deploy = createTarget(options);
      updateProjectConfiguration(tree, projectName, { ...project, targets });
    }
  });
}

export default async function (tree: Tree, options: NxHerokuGeneratorSchema) {
  updateProjects(
    tree,
    options,
    (projectName) => options.projectName === projectName
  );
}
