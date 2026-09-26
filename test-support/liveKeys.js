// Keys from the environment, else from gitignored .env.local.
const fs = require('fs');
const path = require('path');

function readEnvFile() {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map(line => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]),
  );
}

const env = { ...readEnvFile(), ...process.env };

module.exports = {
  tmdb: env.TMDB_API_KEY || null,
  omdb: env.OMDB_API_KEY || null,
};
