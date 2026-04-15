#!/usr/bin/env bash
set -e

DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

node $DIR/scripts/macro.js
terracotta-linux-x64 compile --project $DIR/.build --plotsize 100 --rank overlord > /dev/null
