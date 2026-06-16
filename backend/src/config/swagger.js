const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const specPath = path.join(__dirname, '../../../docs/api/openapi.yaml');
const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));

module.exports = spec;
