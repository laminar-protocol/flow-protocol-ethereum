#!/bin/bash

yarn deploy:development

cd subgraph
yarn build
yarn create-local
yarn deploy-local