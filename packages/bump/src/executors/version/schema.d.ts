export interface VersionExecutorSchema {
  type:
    | 'major'
    | 'minor'
    | 'patch'
    | 'premajor'
    | 'preminor'
    | 'prepatch'
    | 'prerelease'
    | 'from-git';
}
