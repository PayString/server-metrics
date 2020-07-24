import { configure, getLogger } from 'log4js'

/**
 * Test logger configuration.
 */
configure({
  appenders: {
    out: {
      type: 'stdout',

      // Pattern Format documentation: https://github.com/log4js-node/log4js-node/blob/master/docs/layouts.md#pattern-format
      layout: { type: 'pattern', pattern: '%[%-5p%] %m' },
    },
  },
  categories: {
    default: { appenders: ['out'], level: 'INFO' },
  },
})

const logger = getLogger('default')

export default logger
