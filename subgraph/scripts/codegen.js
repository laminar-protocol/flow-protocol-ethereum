#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const template = require('lodash.template');

const deployment = JSON.parse(fs.readFileSync(path.join(__dirname, '../../artifacts/deployment.json')).toString());

const subgraphTemplate = fs.readFileSync(path.join(__dirname, '../subgraph.template.yaml')).toString()

const network = 'kovan'; // TODO: support multiple networks
console.log(`Network: ${network}`);

const subgraph = template(subgraphTemplate)({ deployment: deployment[network], network });

fs.writeFileSync(path.join(__dirname, '../subgraph.yaml'), subgraph);

console.log('subgraph.yaml updated');

const generatedDeploy = Object.entries(deployment[network]).map(([key, value]) => `export const ${key} = '${value}';`).join('\n');

fs.writeFileSync(path.join(__dirname, '../generated/deployment.ts'), generatedDeploy);

console.log('generated/deployment.ts updated');