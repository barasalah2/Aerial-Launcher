import axios from 'axios'

import { repositoryName } from '../../config/about/links'

/**
 * Repository Service
 */

export const repositoryService = axios.create({
  // Without a timeout a hung request blocks bulk operations forever
  timeout: 30_000,
  baseURL: `https://api.github.com/repos/${repositoryName}`,
})
