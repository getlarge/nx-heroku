# Changelog

This file was generated using [@jscutlery/semver](https://github.com/jscutlery/semver).

## [0.2.2](https://github.com/getlarge/nx-heroku/compare/nx-heroku-0.2.1...nx-heroku-0.2.2) (2023-03-07)

### Bug Fixes

- **nx-heroku:** catch errors from heroku drains:add ([4acebe0](https://github.com/getlarge/nx-heroku/commit/4acebe0455bb941045faab1d345d6a24906a4597))
- **nx-heroku:** handle pipelines warning ([7898a06](https://github.com/getlarge/nx-heroku/commit/7898a06e390b37cd19c04a6974b98b07a73003af))
- **nx-heroku:** improve Heroku CLI error and warning handling ([5350364](https://github.com/getlarge/nx-heroku/commit/53503640d2ffccc214fe6543aa7f8c8a9dcd0d23))
- **nx-heroku:** update `HEROKU_AUTH_FILE` invalid path ([0e8faa7](https://github.com/getlarge/nx-heroku/commit/0e8faa725e7a883aa9a6e20c23da5bc0045d8d3d))

## [0.2.1](https://github.com/getlarge/nx-heroku/compare/nx-heroku-0.2.0...nx-heroku-0.2.1) (2023-03-03)

### Bug Fixes

- **nx-heroku:** change git push args to get past auth issue ([fd59651](https://github.com/getlarge/nx-heroku/commit/fd59651c6314db8b27262db9eb8c0d22ce020de6))
- **nx-heroku:** change method to retrieve current branch ([8c4f33c](https://github.com/getlarge/nx-heroku/commit/8c4f33c8775e0ba7ae0e96b38cb5816484dacc69))
- **nx-heroku:** handle case where serviceUser is undefined or invalid ([7388c5d](https://github.com/getlarge/nx-heroku/commit/7388c5d91c51063a73c9c61540e26584cc4541a7))
- **nx-heroku:** make `org` optional to allow personal apps ([d4b8244](https://github.com/getlarge/nx-heroku/commit/d4b82444917c66ab28e8a4aa7c94a9bf66bea657))
- **nx-heroku:** make addons setup non blocking in case of error ([9ea5413](https://github.com/getlarge/nx-heroku/commit/9ea5413b0078a2f6aa2a65bc044b14d3959201db))
- **nx-heroku:** make buildpacks option required ([81646f8](https://github.com/getlarge/nx-heroku/commit/81646f8182601e85867e5f0f6054424b8319177e))
- **nx-heroku:** update generator options assignment ([2e22feb](https://github.com/getlarge/nx-heroku/commit/2e22feb558dcaf8f7a1bd3304dc2974157c2efcd))
- **nx-heroku:** wrap parameters with double quotes ([8e2ad9f](https://github.com/getlarge/nx-heroku/commit/8e2ad9f8285f1ce23f16bce8bcecfcb0921c2a76))

### Reverts

- **nx-heroku:** restore default CWD with spawn ([42dfae4](https://github.com/getlarge/nx-heroku/commit/42dfae4fd61817a8ff0a1fa93e7138f4965e7cce))

## [0.2.0](https://github.com/getlarge/nx-heroku/compare/nx-heroku-0.1.2...nx-heroku-0.2.0) (2023-03-01)

### Features

- **nx-heroku:** add separate helpers for plugins and buildpacks ([157d68c](https://github.com/getlarge/nx-heroku/commit/157d68c46fc09057ff3027da4818d272c0c5f176))
- **nx-heroku:** return and format updated config vars ([5d35801](https://github.com/getlarge/nx-heroku/commit/5d358015e3e911bcd62270794a68c8581127028c))

### Bug Fixes

- **nx-heroku:** improve exec error handling ([90d1dbf](https://github.com/getlarge/nx-heroku/commit/90d1dbf9af1a962b2c0fe6f7537aec4eab3cbd60))
- **nx-heroku:** improve logging and buildpacks setup ([fd37841](https://github.com/getlarge/nx-heroku/commit/fd3784106b822297e567e3a66d14de33d20ede4a))
- **nx-heroku:** replace hardcoded `apps` by nx config value ([f542c48](https://github.com/getlarge/nx-heroku/commit/f542c487b3b538c6fb4e9e2bd90af38404eb1f87))
