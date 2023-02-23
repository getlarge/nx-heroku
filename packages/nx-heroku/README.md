# nx-heroku

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build nx-heroku` to build the library.

## Running unit tests

Run `nx test nx-heroku` to execute the unit tests via [Jest](https://jestjs.io).

## Deploying to Heroku

To deploy your application to Heroku, you need to have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed.

When running the executor for the first time, you will be prompted to login to Heroku. You can also login manually by running `heroku login`.
In Github Actions, it comes already installed.

### Deploy

#### Generate target

To generate a target for your application, run the following command:

```bash
npx nx g @aloes/nx-heroku:deploy --projectName=my-app
```

This will generate a `deploy` target in your `project.json` file.

### Hooks

Heroku allows to run scripts called during the deployment process, for node projects we can make use of package.json scripts to run these hooks.
See the [Heroku documentation](https://devcenter.heroku.com/articles/nodejs-support#customizing-the-build-process) for more details.

For example, we can use the `heroku-postbuild` script to provide our own application build process.

```json
{
  "scripts": {
    "heroku-postbuild": "node tools/heroku/postbuild.js $PROJECT_NAME $PROJECT_ENV",
    "heroku-cleanup": "node tools/heroku/cleanup.js $PROJECT_NAME $PROJECT_ENV"
  }
}
```

I will provide some examples based on my experience with Nx apps deployment on Heroku

#### Custom build process

The `heroku-postbuild` script is used to build the application, it is executed after the `npm install` command.

`tools/heroku/postbuild.js`

```js
const { createPackageJson, createLockFile } = require('@nrwl/devkit');
const { execSync } = require('child_process');
const { writeFileSync } = require('fs');

async function refreshPackageJson(implicitDeps = [], skipDev = false) {
  const projectGraph = await createProjectGraphAsync();
  const { root: projectRoot } = data;
  const options = {
    projectRoot: data.root,
    root: process.cwd(),
    externalDependencies: 'all',
  };
  const packageJson = createPackageJson(projectName, projectGraph, options);
  for (const dep of implicitDeps) {
    packageJson.dependencies[dep] =
      rootPackageJson.dependencies[dep] || rootPackageJson.devDependencies[dep];
  }
  if (skipDev) {
    delete packageJson.devDependencies;
  }
  // we could sort dependencies here
  // packageJson.dependencies = sortObjectByKeys(packageJson.dependencies);
  // packageJson.devDependencies = sortObjectByKeys(packageJson.devDependencies);
  const packageJsonPath = `apps/${projectName}/package.json`;
  if (existsSync(packageJsonPath)) {
    unlinkSync(packageJsonPath);
  }
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // generate and store lock file
  execSync(`npm i --prefix apps/${projectName} --package-lock-only`, {
    stdio: 'inherit',
  });
  // or when using nx >= 15.7.0
  const lockFile = createLockFile(packageJson);
  const packageLockJsonPath = `apps/${projectName}/package-lock.json`;
  writeFileSync(packageLockJsonPath, JSON.stringify(lockFile, null, 2));
}

async function postbuild(argv) {
  const projectName = argv[2] || process.env.PROJECT_NAME;
  const projectEnv = argv[3] || process.env.PROJECT_ENV || 'production';
  const implicitDeps = (argv[4] || process.env.IMPLICIT_DEPS || '').split(',');
  console.log(`Heroku custom postbuild hook, ${projectName}:${projectEnv}`);
  // refresh package-lock to be reused in cleanup phase
  await refreshPackageJson(implicitDeps, true);

  execSync(`npx nx build ${projectName} --c ${projectEnv} `, {
    stdio: 'inherit',
  });
}

postbuild(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

#### Custom cleanup

The `heroku-clean` script is used to cleanup the application before the deployment, it is executed after the `heroku-postbuild` script.
In this case we can remove the `node_modules` folder and only install the given project dependencies to respect the slug size limitation.

`tools/heroku/cleanup.js`

```js
/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');
const { copyFileSync, existsSync, rmSync, writeFileSync } = require('fs');
const { resolve } = require('path');

function cleanup(argv) {
  const projectName = argv[2] || process.env.PROJECT_NAME;
  const projectEnv = argv[3] || process.env.PROJECT_ENV;
  console.log(`Heroku custom cleanup hook, ${projectName}:${projectEnv}`);
  // optionally you can authenticate on NPM here if you need to install private packages
  const npmrc = resolve(process.cwd(), '.npmrc');
  const registryUrl = `//registry.npmjs.org/`;
  const authString =
    registryUrl.replace(/(^\w+:|^)/, '') + ':_authToken=${NPM_TOKEN}';
  const contents = `${authString}${os.EOL}`;
  writeFileSync(npmrc, contents);

  const packageJsonPath = 'package.json';
  const packageLockJsonPath = 'package-lock.json';
  // declare package and package-lock json file paths generated at postbuild phase
  const appPackageJsonPath = `apps/${projectName}/${packageJsonPath}`;
  const appPackageLockJsonPath = `apps/${projectName}/${packageLockJsonPath}`;
  // remove all project dependencies and cache to respect slug size limitation
  if (existsSync('node_modules')) {
    rmSync('node_modules', { recursive: true });
  }
  if (existsSync('.yarn/cache')) {
    rmSync('.yarn/cache', { recursive: true });
  }

  // only backend apps should have generated a custom package.json
  if (existsSync(appPackageJsonPath)) {
    console.log('Found generated package.json');
    // reinstall production deps only
    copyFileSync(appPackageJsonPath, packageJsonPath);
    if (existsSync(appPackageLockJsonPath)) {
      copyFileSync(appPackageLockJsonPath, packageLockJsonPath);
      console.log(`Install dependencies with "npm ci"`);
      execSync('npm ci --production --loglevel=error', { stdio: 'inherit' });
    } else {
      console.log(`Install dependencies with "npm install"`);
      execSync('npm install --production --loglevel=error', {
        stdio: 'inherit',
      });
    }

    // try to remove unnecessary dependencies
    console.log(
      `Install and run node-prune | https://github.com/tj/node-prune`
    );
    execSync('curl -sf https://gobinaries.com/tj/node-prune | PREFIX=. sh');
    execSync('./node-prune', { stdio: 'inherit' });
    rmSync('node-prune');
  }
  // remove .npmrc file if exists
  rmSync('.npmrc');
}

cleanup(process.argv);
```
