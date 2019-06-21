#!/bin/bash

cd deployHooks
npm install js-yaml path
node ./convertEdgeFunctions.js
