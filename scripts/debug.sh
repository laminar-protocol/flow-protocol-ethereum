#!/bin/bash

OUTPUT=$(truffle exec dev-scripts/debug.js | tail -n1)
truffle debug $OUTPUT