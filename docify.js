const fs = require('fs'); // eslint-disable-line
const path = require('path'); // eslint-disable-line
const { spawnSync } = require('child_process'); // eslint-disable-line

const NODE_DIR = 'node_modules';
const INPUT_DIR = 'contracts';
const CONFIG_DIR = 'generated-docs';
const OUTPUT_DIR = 'generated-docs/docs';
// const README_FILE = 'generated-docs/README.md';
const SUMMARY_FILE = 'generated-docs/SUMMARY.md';
const EXCLUDE_FILE = 'generated-docs/exclude.txt';

function lines(pathName) {
  return fs
    .readFileSync(pathName, { encoding: 'utf8' })
    .split('\r')
    .join('')
    .split('\n');
}

const excludeList = lines(EXCLUDE_FILE).map(line => `${INPUT_DIR}/${line}`);
const relativePath = path.relative(path.dirname(SUMMARY_FILE), OUTPUT_DIR);

function scan(pathName, indentation) {
  if (!excludeList.includes(pathName)) {
    if (fs.lstatSync(pathName).isDirectory()) {
      fs.appendFileSync(
        SUMMARY_FILE,
        `${indentation}* ${path.basename(pathName)}\n`,
      );
      for (const fileName of fs.readdirSync(pathName))
        scan(`${pathName}/${fileName}`, `${indentation}  `);
    } else if (pathName.endsWith('.sol')) {
      const text = path.basename(pathName).slice(0, -4);
      const link = pathName.slice(INPUT_DIR.length, -4);
      fs.appendFileSync(
        SUMMARY_FILE,
        `${indentation}* [${text}](${relativePath}${link}.md)\n`,
      );
    }
  }
}

function fix(pathName) {
  if (fs.lstatSync(pathName).isDirectory()) {
    for (const fileName of fs.readdirSync(pathName))
      fix(`${pathName}/${fileName}`);
  } else if (pathName.endsWith('.md')) {
    fs.writeFileSync(
      pathName,
      `${lines(pathName)
        .filter(line => line.trim().length > 0)
        .join('\n\n')}\n`,
    );
  }
}

fs.writeFileSync(SUMMARY_FILE, '# Summary\n');
/*
fs.writeFileSync('.gitbook.yaml', 'root: ./\n');
fs.appendFileSync('.gitbook.yaml', 'structure:\n');
fs.appendFileSync('.gitbook.yaml', `  readme: ${README_FILE}\n`);
fs.appendFileSync('.gitbook.yaml', `  summary: ${SUMMARY_FILE}\n`);
*/

scan(INPUT_DIR, '');

const args = [
  `${NODE_DIR}/solidity-docgen/dist/cli.js`,
  `--input=${INPUT_DIR}`,
  `--output=${OUTPUT_DIR}`,
  `--templates=${CONFIG_DIR}`,
  `--solc-settings=${JSON.stringify({
    optimizer: { enabled: true, runs: 200 },
  })}`,
  '--contract-pages',
];

const result = spawnSync('node', args, {
  stdio: ['inherit', 'inherit', 'pipe'],
});
if (result.stderr.length > 0) throw new Error(result.stderr);

fix(OUTPUT_DIR);
