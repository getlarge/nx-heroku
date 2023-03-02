import { ProjectConfiguration, serializeJson } from '@nrwl/devkit';
import {
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nrwl/nx-plugin/testing';
import { execSync } from 'child_process';
import { rimraf } from 'rimraf';

// SETUP
export async function createProject(prefix: string = 'nx-heroku'): Promise<{
  projectName: string;
  getProjectConfig: () => ProjectConfiguration;
  updateProjectConfig: (config: ProjectConfiguration) => void;
}> {
  const projectName = uniq(prefix);
  await runNxCommandAsync(`generate @nrwl/node:app ${projectName}`);
  const projectConfigPath = `apps/${projectName}/project.json`;
  return {
    projectName,
    getProjectConfig: () => readJson(projectConfigPath),
    updateProjectConfig: (config: ProjectConfiguration) => {
      updateFile(projectConfigPath, serializeJson(config));
    },
  };
}

export function initGit() {
  execSync(
    `git init --quiet
    # Make CI runner happy
    git config user.email "bot@aloes.io"
    git config user.name "Test Bot"
    git config commit.gpgsign false
    `,
    { cwd: tmpProjPath(), stdio: 'inherit' }
  );
}

export function commitTmpProjectFiles() {
  execSync(
    `git add .
    git commit -m "🐣"`,
    { cwd: tmpProjPath(), stdio: 'inherit' }
  );
}

// Setting up individual workspaces per
// test can cause e2e runs to take a long time.
// For this reason, we recommend each suite only
// consumes 1 workspace. The tests should each operate
// on a unique project in the workspace, such that they
// are not dependant on one another.
export function setup() {
  ensureNxProject('@aloes/nx-heroku', 'dist/packages/nx-heroku');
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
    execSync(`heroku apps:destroy ${appName} --confirm ${appName}`, {
      stdio: 'inherit',
    });
  } catch {
    // it's ok, the app was probably not created
  }
}

async function removeTmpWorkspace() {
  await rimraf(tmpProjPath());
}

export async function teardown(projects: string[]) {
  // `nx reset` kills the daemon, and performs
  // some work which can help clean up e2e leftovers
  await runNxCommandAsync('reset');
  await removeTmpWorkspace();
  //  destroy all apps created by the e2e tests
  for (const projectName of projects) {
    for (const environment of ['dev', 'staging']) {
      destroyApp({ projectName, environment });
    }
  }
}
