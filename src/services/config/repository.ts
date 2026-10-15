import axios from 'axios'

import { repositoryName } from '../../config/about/links'

/**
 * Repository Service
 */

export const repositoryService = axios.create({
  baseURL: `https://api.github.com/repos/${repositoryName}`,
})
