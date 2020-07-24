import Metrics from '../src/metrics'

import config from './config'
import { getAddressCountsStub, getPayIDCountStub } from './data-access'
import logger from './logger'

const metrics = new Metrics(
  getAddressCountsStub,
  getPayIDCountStub,
  config,
  logger,
)

logger.log(metrics)
