const projectName = process.argv[2] || process.env.PROJECT_NAME;
const projectEnv = 'production';
console.log(
  `Heroku custom postbuild hook for ${projectName}:${projectEnv} skip build goes faster`
);
// execSync(`npx nx build ${projectName} --c ${projectEnv}`, { stdio: 'inherit' });
