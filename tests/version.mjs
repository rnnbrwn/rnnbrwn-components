// The WordPress half's version (wordpress/version.php) must equal package.json's. No browser needed.
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const { version } = JSON.parse(read('../package.json'));
const php = read('../wordpress/version.php').match(/RNNBRWN_COMPONENTS_VERSION = '([^']+)'/)?.[1];

if (php === version) {
  console.log(`PASS wordpress/version.php and package.json are both ${version}`);
} else {
  console.log(`FAIL wordpress/version.php is ${php} but package.json is ${version}`);
  process.exit(1);
}
