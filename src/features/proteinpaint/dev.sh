#!/bin/bash

# for SJ tools developers only: run from the mmrf-data-commons dir,
# ./src/features/proteinpaint/dev.sh <unlink>
# assumes that the proteinpaint folder is a sibling dir of gff

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
#node version is reported in package.json in "engines.node"
#nvm install 24.14.0
#rm -rf node_modules package-lock.json
#npm install
nvm use 24.14.0

if [[ "$1" == "unlink" ]]; then
	# to test the published client package before submitting a PR with an updated pp-client version
	npm unlink ../proteinpaint/client
	npm uninstall @sjcrh/proteinpaint-client --save
	npm install @sjcrh/proteinpaint-client --save

else
	rm -rf node_modules/@sjcrh
	# to test the local PP client code
	npm link ../proteinpaint/client
fi

PROTEINPAINT_API=http://localhost:3000 \
NEXT_PUBLIC_PROTEINPAINT_API=/protein-paint \
NEXT_PUBLIC_GEN3_API=http://localhost:3333 \
NEXT_PUBLIC_GEN3_API_TARGET=https://dev-virtuallab.themmrf.org \
PORT=3333 npm run dev -- --hostname 127.0.0.1

#
# close all open Chrome browser windows and in macOS terminal:
# open -n /Applications/Google\ Chrome.app --args --user-data-dir="/tmp/chrome-dev-session" --disable-web-security
#
# TODO: setup and use https://localhost.dev-virtuallab.themmrf.org using local-ssl-proxy or with nginx
#
