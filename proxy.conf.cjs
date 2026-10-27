require('dotenv').config({ quiet: true });

const target = process.env.API_PROXY_TARGET?.trim();
if (!target) {
  throw new Error('Set API_PROXY_TARGET in .env (see .env.template).');
}

const url = new URL(target);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
  throw new Error('API_PROXY_TARGET must be an HTTP(S) URL without credentials.');
}

module.exports = {
  '/api/**': { target, secure: true, changeOrigin: true },
};
