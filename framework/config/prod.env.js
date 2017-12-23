var merge = require('webpack-merge')
var meta = require('./../../metadata.json')

Object.keys(meta).forEach(function(key) {
  meta[key] = `"${meta[key]}"`
})

module.exports = merge(meta, {
  NODE_ENV: '"production"',
  MAPI: '""',
  MODE: '"history"'
})
