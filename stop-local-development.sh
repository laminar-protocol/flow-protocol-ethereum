#!/bin/bash

echo "Stopping docker..."
docker-compose stop

yarn unlink
