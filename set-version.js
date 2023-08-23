import { execSync } from 'child_process';

const gitVersion = execSync('git rev-parse HEAD').toString().trim();
process.env.REACT_APP_VERSION = gitVersion;
