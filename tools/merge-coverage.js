const { existsSync, readFileSync } = require('fs');
const glob = require('glob');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const { create: createReporter } = require('istanbul-reports');
const yargs = require('yargs');

const COVERAGE_FOLDER = 'coverage';

function mergeCoverage(
  coverageFolder = COVERAGE_FOLDER,
  reporters = ['json', 'lcov', 'text'],
  basePath = ''
) {
  const coverageMap = createCoverageMap({});
  const pattern = basePath
    ? `${basePath}/${coverageFolder}/**/coverage-final.json`
    : `${coverageFolder}/**/coverage-final.json`;
  const reportFiles = glob.sync(pattern);
  reportFiles.forEach((coveragePath) => {
    if (!existsSync(coveragePath)) {
      return;
    }
    let coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
    if (process.env.CI) {
      // fix invalid file path in Github actions
      coverage = Object.keys(coverage).reduce((acc, key) => {
        // make filepath relative to basePath instead of repository root
        const { name } = require('../package.json');
        const filePath = key.replace(`/home/runner/work/${name}/${name}/`, '');
        const newKey = filePath;
        coverage[key].path = filePath;
        return { ...acc, [newKey]: coverage[key] };
      }, {});
    }
    coverageMap.merge(coverage);
  });

  const coverageDir = basePath
    ? `${basePath}/${coverageFolder}`
    : coverageFolder;
  const context = createContext({
    dir: coverageDir,
    coverageMap,
  });

  reporters.forEach((reporter) => {
    const report = createReporter(reporter);
    report.execute(context);
  });
  console.log(`Created a merged coverage report in ${coverageDir}`);
}

async function main() {
  const argv = await yargs.options({
    projectPaths: {
      array: true,
      type: 'string',
      default: [],
      alias: 'p',
    },
    reporters: {
      array: true,
      type: 'string',
      default: ['json', 'lcov', 'text'],
      demandOption: true,
      alias: 'r',
    },
    coverageFolder: {
      type: 'string',
      default: COVERAGE_FOLDER,
      demandOption: true,
      alias: 'c',
    },
  }).argv;

  const { coverageFolder, projectPaths, reporters } = argv;

  if (projectPaths.length) {
    projectPaths.forEach((basePath) => {
      mergeCoverage(coverageFolder, reporters, basePath);
    });
  } else {
    mergeCoverage(coverageFolder, reporters);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
