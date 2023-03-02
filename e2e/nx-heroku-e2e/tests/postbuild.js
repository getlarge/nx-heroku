const { execSync } = require('child_process');
const projectName = process.argv[2] || process.env.PROJECT_NAME;
const projectEnv = 'production';
console.log(`Heroku custom postbuild hook, skip build goes faster`);
execSync(`npx nx build ${projectName} --c ${projectEnv}`, { stdio: 'inherit' });
