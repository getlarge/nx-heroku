import { runNxCommandAsync } from '@nx/plugin/testing';
import {
  createProject,
  prepareProjectForDeployment,
  setup,
  teardown,
} from './tools';

const org = 'test-org';
const HEROKU_API_KEY = '${HEROKU_API_KEY}';
const HEROKU_EMAIL = '${HEROKU_EMAIL}';

describe('nx-heroku e2e', () => {
  const projects: string[] = [];

  beforeAll(() => {
    // environment variables that will be resolved by the generators
    // we use this trick to avoid expansion by the shell as quoting of the parameteres value does not seem to work
    // then the real value can be replaced by the executor during its execution only
    process.env.HEROKU_API_KEY_PREV = process.env.HEROKU_API_KEY;
    process.env.HEROKU_EMAIL_PREV = process.env.HEROKU_EMAIL;
    process.env.HEROKU_API_KEY = HEROKU_API_KEY;
    process.env.HEROKU_EMAIL = HEROKU_EMAIL;
    setup();
  });

  afterAll(async () => {
    await teardown(projects);
  }, 120000);

  describe('deploy', () => {
    // no mo required options
    it.skip('should fail to create target when required options are missing', async () => {
      const { projectName, getProjectConfig } = await createProject();
      //
      await expect(
        runNxCommandAsync(`generate @getlarge/nx-heroku:deploy ${projectName}`)
      ).rejects.toThrowError();
      const project = getProjectConfig();
      expect(project.targets?.deploy).toBeUndefined();
    }, 120000);

    it('should create target with org', async () => {
      const { projectName, getProjectConfig } = await createProject();
      //
      await runNxCommandAsync(
        `generate @getlarge/nx-heroku:deploy ${projectName} --org ${org}`
      );
      const project = getProjectConfig();
      expect(project.targets?.deploy?.options?.org).toEqual(org);
    }, 120000);

    it('should create target with Heroku credentials option', async () => {
      const { projectName, getProjectConfig } = await createProject();
      //
      //? the single quotes does not prevent parameter expansion
      await runNxCommandAsync(
        `generate @getlarge/nx-heroku:deploy ${projectName} --org ${org} --apiKey '${HEROKU_API_KEY}' --email '${HEROKU_EMAIL}'`
      );
      const project = getProjectConfig();
      expect(project.targets?.deploy?.options?.apiKey).toEqual(HEROKU_API_KEY);
      expect(project.targets?.deploy?.options?.email).toEqual(HEROKU_EMAIL);
    }, 120000);

    it('should create target and deploy an app with simple configuration successfully', async () => {
      const { projectName, getProjectConfig, updateProjectConfig } =
        await createProject();

      projects.push(projectName);
      // restore the environment variables to be expanded by the executor
      process.env.HEROKU_API_KEY = process.env.HEROKU_API_KEY_PREV;
      process.env.HEROKU_EMAIL = process.env.HEROKU_EMAIL_PREV;
      // configure the target
      await runNxCommandAsync(
        `generate @getlarge/nx-heroku:deploy ${projectName} --appNamePrefix=aloes`
      );
      const project = getProjectConfig();
      project.targets!.deploy.options = {
        ...(project.targets!.deploy.options || {}),
        procfile: `web: node dist/apps/${projectName}/main.js`,
        buildPacks: ['heroku/nodejs'],
        apiKey: HEROKU_API_KEY,
        email: HEROKU_EMAIL,
        variables: {
          // used in postbuild.js
          PROJECT_NAME: projectName,
        },
        useForce: true,
        serviceUser: 'edouard@aloes.io',
        debug: true,
      };
      updateProjectConfig(project);
      prepareProjectForDeployment(projectName);
      // run the target
      const { stderr, stdout } = await runNxCommandAsync(
        `deploy ${projectName} --verbose`,
        { silenceError: true }
      );
      console.warn(stdout, stderr);
      expect(stdout).toContain('Deployment successful.');
    }, 100000);

    it('should create target and deploy the app with complex configuration successfully', async () => {
      const { projectName, getProjectConfig, updateProjectConfig } =
        await createProject();

      projects.push(projectName);
      // restore the environment variables to be expanded by the executor
      process.env.HEROKU_API_KEY = process.env.HEROKU_API_KEY_PREV;
      process.env.HEROKU_EMAIL = process.env.HEROKU_EMAIL_PREV;
      // configure the target
      await runNxCommandAsync(
        `generate @getlarge/nx-heroku:deploy ${projectName} --appNamePrefix=aloes`
      );
      const project = getProjectConfig();
      project.targets!.deploy.options = {
        ...(project.targets!.deploy.options || {}),
        procfile: `web: node dist/apps/${projectName}/main.js`,
        buildPacks: ['heroku/nodejs', 'heroku-community/multi-procfile'],
        apiKey: HEROKU_API_KEY,
        email: HEROKU_EMAIL,
        addons: [
          {
            addonName: 'rediscloud:30',
            addonAlias: 'REDIS',
          },
        ],
        webhook: {
          url: 'https://example.com/webhook',
          secret: 'super secret',
          include: ['api:build', 'api:release'],
        },
        drain: {
          url: 'https://basic:auth@example.com/drain',
        },
        variables: {
          // used in postbuild.js
          PROJECT_NAME: projectName,
        },
        useForce: true,
        //? resetRepo: true,
        serviceUser: 'edouard@aloes.io',
        debug: true,
      };
      updateProjectConfig(project);
      prepareProjectForDeployment(projectName);
      // run the target
      const { stderr, stdout } = await runNxCommandAsync(
        `deploy ${projectName} --verbose`,
        { silenceError: true }
      );
      console.warn(stdout, stderr);
      expect(stdout).toContain('Deployment successful.');
      // TODO: check that the app was deployed, pipeline was created, etc.
    }, 200000);
  });

  describe.skip('promote', () => {
    it('should create target and run it successfully', async () => {
      const { projectName, getProjectConfig, updateProjectConfig } =
        await createProject();
      projects.push(projectName);

      // TODO: first deploy then promote, or use existing app ? would be faster but goes against the principle of one project per test

      await runNxCommandAsync(
        `generate @getlarge/nx-heroku:promote ${projectName} --apiKey='${HEROKU_API_KEY}' --email='${HEROKU_EMAIL}' --appNamePrefix=aloes`
      );
      const project = getProjectConfig();
      project.targets!.deploy.options = {
        ...(project.targets!.deploy.options || {}),
        serviceUser: 'edouard@aloes.io',
        debug: true,
      };
      updateProjectConfig(project);
      const { stdout } = await runNxCommandAsync(
        `promote ${projectName} --verbose`,
        { silenceError: true }
      );
      expect(stdout).toContain('Promotion successful.');
      // TODO: check that the app was promoted, pipeline was created|updated, etc.
    }, 120000);
  });
});
