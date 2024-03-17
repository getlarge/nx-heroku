// inspired by https://github.com/nrwl/nx/blob/master/packages/eslint/src/plugins/plugin.ts
import {
  CreateDependencies,
  CreateNodes,
  CreateNodesContext,
  joinPathFragments,
  NxJsonConfiguration,
  readJsonFile,
  TargetConfiguration,
  writeJsonFile,
} from '@nx/devkit';
import { calculateHashForCreateNodes } from '@nx/devkit/src/utils/calculate-hash-for-create-nodes';
import { getNamedInputs } from '@nx/devkit/src/utils/get-named-inputs';
import { minimatch } from 'minimatch';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getGlobPatternsFromPackageManagerWorkspaces } from 'nx/src/plugins/package-json-workspaces';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import { combineGlobPatterns } from 'nx/src/utils/globs';

export interface HerokuPluginOptions {
  buildTarget: string;
  deployTargetName: string;
  promoteTargetName: string;
}

const cachePath = join(projectGraphCacheDirectory, 'heroku.hash');
const targetsCache = existsSync(cachePath) ? readTargetsCache() : {};

const calculatedTargets: Record<
  string,
  Record<string, TargetConfiguration>
> = {};

function readTargetsCache(): Record<
  string,
  Record<string, TargetConfiguration>
> {
  return readJsonFile(cachePath);
}

function writeTargetsToCache(
  targets: Record<string, Record<string, TargetConfiguration>>
) {
  writeJsonFile(cachePath, targets);
}

export const createDependencies: CreateDependencies = () => {
  writeTargetsToCache(calculatedTargets);
  return [];
};

export const createNodes: CreateNodes<Partial<HerokuPluginOptions>> = [
  combineGlobPatterns(['**/Procfile']),
  (configFilePath, options, context) => {
    const projectRoot = dirname(configFilePath);
    // Do not create a project if package.json and project.json isn't there.
    const siblingFiles = readdirSync(join(context.workspaceRoot, projectRoot));
    if (
      !siblingFiles.includes('package.json') &&
      !siblingFiles.includes('project.json')
    ) {
      return {};
    } else if (
      !siblingFiles.includes('project.json') &&
      siblingFiles.includes('package.json')
    ) {
      const packageManagerWorkspacesGlob = combineGlobPatterns(
        getGlobPatternsFromPackageManagerWorkspaces(context.workspaceRoot)
      );
      const path = joinPathFragments(projectRoot, 'package.json');
      const isPackageJsonProject = minimatch(
        path,
        packageManagerWorkspacesGlob
      );
      if (!isPackageJsonProject) {
        return {};
      }
    }

    const opts = normalizeOptions(options ?? {});
    const hash = calculateHashForCreateNodes(projectRoot, opts, context);
    const targets =
      targetsCache[hash] ??
      buildHerokuTargets(configFilePath, projectRoot, opts, context);

    calculatedTargets[hash] = targets;
    return {
      projects: {
        [projectRoot]: {
          root: projectRoot,
          targets,
        },
      },
    };
  },
];

function getInputs(
  namedInputs: NxJsonConfiguration['namedInputs']
): TargetConfiguration['inputs'] {
  return [
    ...(namedInputs && 'production' in namedInputs
      ? ['default', '^production']
      : ['default', '^default']),
  ];
}

function buildHerokuTargets(
  configFilePath: string,
  projectRoot: string,
  options: HerokuPluginOptions,
  context: CreateNodesContext
) {
  const namedInputs = getNamedInputs(projectRoot, context);

  const targets: Record<string, TargetConfiguration> = {};
  const baseConfig: TargetConfiguration = {
    cache: false,
    inputs: getInputs(namedInputs),
  };
  const procfile = readFileSync(
    join(context.workspaceRoot, configFilePath),
    'utf-8'
  ).trim();

  const deployConfig: TargetConfiguration = {
    ...baseConfig,
    executor: '@getlarge/nx-heroku:deploy',
    options: {
      procfile,
    },
  };
  const promoteConfig: TargetConfiguration = {
    ...baseConfig,
    executor: '@getlarge/nx-heroku:promote',
    options: {},
  };

  targets[options.deployTargetName] = deployConfig;
  targets[options.promoteTargetName] = promoteConfig;
  return targets;
}

function normalizeOptions(
  options: Partial<HerokuPluginOptions>
): HerokuPluginOptions {
  return {
    deployTargetName: options.deployTargetName ?? 'deploy',
    promoteTargetName: options.promoteTargetName ?? 'promote',
    buildTarget: options.buildTarget ?? 'build',
  };
}
