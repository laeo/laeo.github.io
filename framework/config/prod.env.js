let merge     = require('webpack-merge')
let app       = require('./../../app.json')
let constants = {}

Object.keys(app).forEach(function(key) {
  constants[key] = `"${app[key]}"`
})

module.exports = merge(constants, {
  NODE_ENV: '"production"',
  MAPI: '""',
  MODE: '"history"'
})
