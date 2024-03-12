import {
  NxJsonConfiguration,
  ProjectConfiguration,
  serializeJson,
} from '@nx/devkit';
import {
  cleanup,
  ensureNxProject,
  patchPackageJsonForPlugin,
  readJson,
  runNxCommandAsync,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nx/plugin/testing';
import { execSync as oGExecSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { PackageJson } from 'nx/src/utils/package-json';
import {
  createNetRcFile,
  removeNetRcFile,
} from '../../../packages/nx-heroku/src/executors/common/heroku';

const PLUGIN_NAME = '@aloes/nx-heroku';
const PLUGIN_PATH = 'dist/packages/nx-heroku';
const E2E_PATH = 'e2e/nx-heroku-e2e';

function execSync(command: string) {
  return oGExecSync(command, { cwd: tmpProjPath() });
}

// SETUP

function copyScript(name: string) {
  const scriptName = `${name}.js`;
  const src = join(process.cwd(), E2E_PATH, 'tests', scriptName);
  const dest = tmpProjPath(scriptName);
  copyFileSync(src, dest);
}

export function initGit() {
  execSync(
    `git init --quiet
    # Make CI runner happy
    git config user.email "${process.env.HEROKU_EMAIL || 'ed@getlarge.eu'}"
    git config user.name "Test Bot"
    git config commit.gpgsign false
    `
  );
}

export function commitTmpProjectFiles() {
  execSync(
    `git add .
    git commit -m "genesis"`
  );
}

// Setting up individual workspaces per
// test can cause e2e runs to take a long time.
// For this reason, we recommend each suite only
// consumes 1 workspace. The tests should each operate
// on a unique project in the workspace, such that they
// are not dependant on one another.
export function setup() {
  ensureNxProject(PLUGIN_NAME, PLUGIN_PATH);
  const nxJsonPath = 'nx.json';
  const nxJson: NxJsonConfiguration = readJson(nxJsonPath);
  nxJson.workspaceLayout = { appsDir: 'apps', libsDir: 'libs' };
  updateFile(nxJsonPath, serializeJson(nxJson));
  copyScript('postbuild');
  initGit();
  commitTmpProjectFiles();
}

// TEARDOWN

function destroyApp(options: {
  projectName: string;
  appNamePrefix?: string;
  environment?: string;
}) {
  const { projectName, appNamePrefix = 'aloes', environment = 'dev' } = options;
  const appName = `${appNamePrefix}-${projectName}-${environment}`;
  // see https://devcenter.heroku.com/articles/heroku-cli-commands#heroku-apps-destroy
  try {
    execSync(`heroku apps:destroy ${appName} --confirm ${appName}`);
  } catch (e) {
    // it's ok, the app was probably not created
    if (!e.toString().includes("Couldn't find that app.")) {
      console.warn(e);
    }
  }
}

export async function teardown(projects: string[]) {
  // `nx reset` kills the daemon, and performs
  // some work which can help clean up e2e leftovers
  await runNxCommandAsync('reset');
  await createNetRcFile({
    apiKey: process.env.HEROKU_API_KEY as string,
    email: process.env.HEROKU_EMAIL as string,
  });
  //  destroy all apps created by the e2e tests
  for (const projectName of projects) {
    for (const environment of ['dev', 'staging']) {
      destroyApp({ projectName, environment });
    }
  }
  cleanup();
  await removeNetRcFile();
}

// TEST HELPERS

export async function createProject(prefix: string = 'nx-heroku'): Promise<{
  projectName: string;
  getProjectConfig: () => ProjectConfiguration;
  updateProjectConfig: (config: ProjectConfiguration) => void;
}> {
  const projectName = uniq(prefix);
  await runNxCommandAsync(
    `generate @nx/node:app ${projectName} --directory=apps`
  );
  const projectConfigPath = join('apps', projectName, 'project.json');
  return {
    projectName,
    getProjectConfig: () => readJson(projectConfigPath),
    updateProjectConfig: (config: ProjectConfiguration) => {
      updateFile(projectConfigPath, serializeJson(config));
    },
  };
}

/**
 *
 * @description commit project to be synced with the heroku remote
 * @param projectName Nx preoject name
 */
function commitProject(projectName: string) {
  execSync(
    `git add apps/${projectName}/. && git commit -m "feat: init project ${projectName}" -n --no-gpg-sign`
  );
}

type PkgJson = PackageJson & {
  engines: { node?: string; npm?: string; yarn?: string };
};

/**
 *
 * @description patch package.json to be compatible with heroku installation
 */
function patchPackageJson() {
  const packageJson = readJson<PkgJson>('package.json');
  packageJson.engines = {
    node: '>=16.x',
  };
  // remove plugin local path
  packageJson.devDependencies ??= {};
  delete packageJson.devDependencies[PLUGIN_NAME];
  // declare heroku build scripts
  packageJson.scripts ??= {};
  //? packageJson.scripts['heroku-prebuild'] = 'node ./prebuild.js';
  packageJson.scripts['heroku-postbuild'] = `node ./postbuild.js`;
  updateFile('package.json', serializeJson(packageJson));
  execSync(`npm install --package-lock-only`);
}

function commitPackageJson() {
  execSync(
    `git add package*.json && git commit -m "chore: update package*.json" -n --no-gpg-sign`
  );
}

function setPackageJsonForHeroku() {
  patchPackageJson();
  commitPackageJson();
  patchPackageJsonForPlugin(PLUGIN_NAME, PLUGIN_PATH);
}

export function prepareProjectForDeployment(projectName: string) {
  commitProject(projectName);
  setPackageJsonForHeroku();
}
