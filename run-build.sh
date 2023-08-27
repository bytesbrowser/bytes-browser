#!/bin/bash

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS-specific commands
  echo 'Running on macOS';

  yarn run build:mac;
else
  # Windows-specific commands
  echo 'Running on Windows';

  yarn run build:win;
fi