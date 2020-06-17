#!/usr/bin/env node

/* eslint-disable import/no-extraneous-dependencies, @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');
const template = require('lodash.template');

const subgraphTemplate = fs
  .readFileSync(path.join(__dirname, '../subgraph.template.yaml'))
  .toString();

const network = process.env.NETWORK;
console.log(`Network: ${network}`);

const deployment = JSON.parse(
  fs
    .readFileSync(
      path.join(__dirname, `../../artifacts/${network}/deployment.json`),
    )
    .toString(),
);

const subgraph = template(subgraphTemplate)({
  deployment,
  network,
});

fs.writeFileSync(path.join(__dirname, '../subgraph.yaml'), subgraph);

console.log('subgraph.yaml updated');

const generatedDeploy = Object.entries(deployment)
  .map(([key, value]) => `export const ${key} = '${value}';`)
  .join('\n');

try {
  fs.mkdirSync(path.join(__dirname, '../generated'), {rescursive: true});
} catch {
  // ignore mkdir error
}

fs.writeFileSync(
  path.join(__dirname, '../generated/deployment.ts'),
  generatedDeploy,
);

console.log('generated/deployment.ts updated');
