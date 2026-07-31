#!/usr/bin/env sh
set -eu

docker compose config >/dev/null
find . -name package.json -maxdepth 4 -print >/dev/null
