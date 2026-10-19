#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
bundle exec jekyll serve --host 127.0.0.1 --livereload "$@"
