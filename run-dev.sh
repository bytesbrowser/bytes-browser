#!/bin/bash

if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS-specific commands
  echo 'Running on macOS';

  yarn run dev:mac;
else
  # Windows-specific commands
  echo 'Running on Windows';

  yarn run dev:win;
fi