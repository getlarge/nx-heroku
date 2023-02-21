import {
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';

describe('nx-heroku e2e', () => {
  // Setting up individual workspaces per
  // test can cause e2e runs to take a long time.
  // For this reason, we recommend each suite only
  // consumes 1 workspace. The tests should each operate
  // on a unique project in the workspace, such that they
  // are not dependant on one another.
  beforeAll(() => {
    ensureNxProject('@aloes/nx-heroku', 'dist/packages/nx-heroku');
  });

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset');
    // TODO: cleanup heroku apps, pipelines, etc.
  });

  // it('should create nx-heroku and run deploy target', async () => {
  //   const project = uniq('nx-heroku');
  // create project
  //   await runNxCommandAsync(`generate @aloes/nx-heroku:deploy ${project}`);
  //   const result = await runNxCommandAsync(`deploy ${project}`);
  //   expect(result.stdout).toContain('Deployment successful.');
  //   // TODO: check that the app was deployed, pipeline was created, etc.
  // }, 120000);

  describe('--apiKey', () => {
    it('should create target with apiKey option', async () => {
      const projectName = uniq('nx-heroku');
      const apiKey = '${HEROKU_API_KEY}';
      await runNxCommandAsync(
        `generate @aloes/nx-heroku:deploy ${projectName} --apiKey ${apiKey}`
      );
      const project = readJson(`libs/${projectName}/project.json`);
      expect(project.targets.deploy.options.apiKey).toEqual(apiKey);
    }, 120000);
  });

  describe('--email', () => {
    it('should create target with email option', async () => {
      const projectName = uniq('nx-heroku');
      const email = '${HEROKU_EMAIL}';
      await runNxCommandAsync(
        `generate @aloes/nx-heroku:deploy ${projectName} --email ${email}`
      );
      const project = readJson(`libs/${projectName}/project.json`);
      expect(project.targets.deploy.options.email).toEqual(email);
    }, 120000);
  });

  describe('--org', () => {
    it('should create target with org', async () => {
      const projectName = uniq('nx-heroku');
      ensureNxProject('@aloes/nx-heroku', 'dist/packages/nx-heroku');
      await runNxCommandAsync(
        `generate @aloes/nx-heroku:deploy ${projectName} --org test-org`
      );
      const project = readJson(`libs/${projectName}/project.json`);
      expect(project.targets.deploy.options.org).toEqual('test-org');
    }, 120000);
  });
});
