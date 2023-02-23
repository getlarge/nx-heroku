# nx-heroku

This library was generated with [Nx](https://nx.dev).

## Conventions

The application names deployed on Heroku are composed with the pattern `${appPrefixName}-${projectName}-${environment}`, where

- `appPrefixName` is the prefix name of the Heroku app, it can be customized via the `appNamePrefix` option.
- `projectName` is the name of the Nx project.
- `environment` is the Heroku pipeline stage (development, staging or production), it can be customized via the `config` option.

Due to some length limitations (32 characters), the environment name is shortened and the application name might be shortened as well.

Examples:

- `aloes-my-service-dev`
- `aloes-frontend-staging`
- `aloes-myapp-prod`

This logic is applied in this [Heroku helpers module](./packages/nx-heroku/src/executors/common/heroku/apps.ts)

## Deploying to Heroku

To deploy your application to Heroku, you need to have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed.
In Github Actions, it comes already installed in the runners.

When running the executor, it will login to Heroku with the credentials (`email`, `apiKey`) provided via the executors options.

### Generate target

To generate a target for your application, run the following command:

```bash
npx nx g @aloes/nx-heroku:deploy --projectName=my-app --org=your-heroku-team --appNamePrefix=your-app-prefix
```

This will generate a `deploy` target in your `project.json` file.

### Execute target

The [`nx-heroku:deploy`](./packages/nx-heroku/src//executors/deploy/executor.ts) executor allows to deploy an Nx application to a targeted Heroku app. The deployment will be done for each pipeline stage declared via the option `config` (default: ['development'])
Variables prefixed by `HD_` will be added (without the prefix) to the Heroku app config automatically.

The environment variables `HD_PROJECT_NAME`,`HD_PROJECT_ENV`, `HD_NODE_ENV` and `HD_PROCFILE` will automatically be defined based on the project name and environment being deployed.
`PROCFILE` is required when using [multi-procfile buildpack](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-multi-procfile), it should be defined in each Heroku app to indicate the Procfile path for the given project.

Extra buildpacks can be provided by using `buildPacks` option, they will be installed in the order they are provided in the array.

You can have a look at the [schema](./packages/nx-heroku/src/executors/deploy/schema.json) of the executor to see all the options available.

If the Heroku app doesn't exist, it will be created and named after the pattern described in [Conventions](#conventions).

- `appName` is set with `-p` option and needs to match between the project path under `apps`.
- `prefix` defaults to `s1` and can be customized via `-P` options
- `env` will be automatically defined based on `-c` option

For the given example project config:

```json
{
  "name": "frontend",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "apps/frontend/src",
  "targets": {
    ...,
    "deploy": {
      "executor": "@aloes/nx-heroku:deploy",
      "options": {
        "appNamePrefix": "aloes",
        "org": "aloes",
        "buildPacks": [
          "heroku/nodejs",
          "heroku-community/multi-procfile",
          "heroku-community/nginx"
        ],
        "variables": {
          "NGINX_APP_ROOT": "dist/apps/frontend",
          "YARN2_SKIP_PRUNING": "true"
        },
        "procfile": "web: bin/start-nginx-solo",
        "useForce": true,
        "debug": true
      }
    },
  }
}

```

You can run the deployment with :

```bash
export HEROKU_API_KEY=<your_heroku_api_key>
export HEROKU_EMAIL=<your_heroku_account_email>

npx nx run deploy frontend --config 'development,staging' --apiKey $HEROKU_API_KEY --email $HEROKU_EMAIL
```

---

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

I will provide some examples based on my experience with Nx apps deployment on Heroku.

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
