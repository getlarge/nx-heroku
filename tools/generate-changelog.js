// produce changelog to be piped to `gh release create <tag> -F-`
// test with :
// node tools/generate-changelog.js -s "1.0.0" | node -e "const fs = require('fs'); const stdinBuffer = fs.readFileSync(0); console.log(stdinBuffer.toString())"

// changelog
function extractFromChangelog({ changelog, verbose, version }) {
  // accept various ways to specify version starting like
  // # 1.0
  // ## v1.0
  // ## [v1.0
  const versionStartStringRe = '^##? \\[?v?';
  const versionStartRe = new RegExp(versionStartStringRe);
  const versionRe = new RegExp(
    versionStartStringRe + version.replace(/\./, '.')
  );
  const footerLinkRe = new RegExp('^\\[');

  let start = false;
  const changelogLines = changelog.replace(/\r\n/g, '\n').split('\n');

  return changelogLines
    .filter((line) => {
      verbose && console.log('MATCH', line.match(versionRe));
      if (!start && line.match(versionRe)) {
        verbose && console.log('START');
        start = true;
      } else if (
        start &&
        (line.match(versionStartRe) || line.match(footerLinkRe))
      ) {
        verbose && console.log('END');
        start = false;
      } else if (start) {
        verbose && console.log(line);
        // between start & end, collect lines
        return true;
      }
      verbose && console.log('IGNORED ' + line);
      return false;
    })
    .join('\n')
    .trim();
}

module.exports = {
  extractFromChangelog,
};
