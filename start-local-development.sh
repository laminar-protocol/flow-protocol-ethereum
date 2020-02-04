#!/bin/bash

echo "Clean up docker data"
rm -rf ./data/* # temporary solution until we find a way to make ganache persist data

echo "Starting docker-compose..."
echo "This will take a few moments"
docker-compose up -d

yarn link

echo "Run \`yarn link \"flow-protocol-ethereum\"\` into your project"

