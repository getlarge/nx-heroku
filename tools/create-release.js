const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { join, resolve } = require('path');
const { extractFromChangelog } = require('./generate-changelog');

// produce changelog to be piped to `gh release create <tag> -F-`
// test with :
// node tools/generate-changelog.js -s "1.0.0" | node -e "const fs = require('fs'); const stdinBuffer = fs.readFileSync(0); console.log(stdinBuffer.toString())"

const changelogFileNames = ['CHANGELOG.md', 'Changelog.md', 'changelog.md'];

const validateParameters = ({ projectName, filename, semver }) => {
  if (!projectName && !filename && !semver) {
    throw new Error('Missing required arguments');
  }
  if (projectName && (filename || semver)) {
    throw new Error('Cannot specify both projectName and filename or version');
  }
  if ((filename && !semver) || (!filename && semver)) {
    throw new Error('Should specify both filename and version');
  }
};

const getProjectPath = (projectName) =>
  join(process.cwd(), `packages/${projectName}`);

// read root or project package.json
const getPackageJson = (projectName) => {
  const packageJsonPath = projectName
    ? `${getProjectPath(projectName)}/package.json`
    : join(process.cwd(), 'package.json');

  try {
    return require(packageJsonPath);
  } catch (e) {
    throw new Error(`No package.json found in ${packageJsonPath}`);
  }
};

const getChangelogPath = (projectName) => {
  let value;
  for (const fileName of changelogFileNames) {
    const absolutePath = projectName
      ? join(getProjectPath(projectName), fileName)
      : resolve(fileName);
    if (fs.existsSync(absolutePath)) {
      value = absolutePath;
      break;
    }
  }
  return value;
};

const getChangelog = (filename) => {
  try {
    return fs.readFileSync(filename, {
      encoding: 'utf8',
    });
  } catch (e) {
    throw new Error(`${filename} not found.`);
  }
};

// Look for the tag in either X.Y.Z or vX.Y.X formats
const getTagName = (semver, projectName) => {
  const tags = execSync('git tag', { encoding: 'utf8' });
  const searchString = projectName
    ? `^${projectName}-(v?)${semver}$`
    : `^(v?)${semver}$`;
  const tagMatches = tags.match(new RegExp(searchString, 'gm'));
  if (!tagMatches) {
    throw new Error(`Tag ${semver} or v${semver} not found`);
  }
  return tagMatches[0];
};

(function () {
  try {
    const argv = yargs(hideBin(process.argv))
      .usage('Usage: $0 [--filename CHANGELOG.md] [--semver 1.5.0]')
      .usage('Usage: $0 [--project nx-heroku]')
      .options({
        projectName: {
          description: 'Nx project name',
          demandOption: false,
          alias: 'p',
          type: 'string',
        },
        filename: {
          description: 'Full Changelog path',
          demandOption: false,
          alias: 'f',
          type: 'string',
        },
        semver: {
          description: 'Version to extract from changelog',
          demandOption: false,
          alias: 's',
          type: 'string',
        },
      })
      .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
      }).argv;

    validateParameters(argv);

    const { projectName, filename, semver, verbose } = argv;
    const changelogPath = projectName
      ? getChangelogPath(projectName)
      : path.resolve(process.cwd(), filename);

    const changelog = getChangelog(changelogPath);
    const version = projectName ? getPackageJson(projectName).version : semver;
    const tag = getTagName(version, projectName);
    const versionChangelog = extractFromChangelog({
      changelog,
      version,
      verbose,
    });

    execSync(`gh release create ${tag} -n "${versionChangelog}"`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
