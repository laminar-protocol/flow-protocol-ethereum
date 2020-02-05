#!/bin/bash

yarn deploy:development
cd subgraph
yarn create-local
yarn deploy-local