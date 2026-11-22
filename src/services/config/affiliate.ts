import axios from 'axios'

import { Manifest } from '../../kernel/core/manifest'

export const affiliateService = axios.create({
  // Without a timeout a hung request blocks bulk operations forever
  timeout: 30_000,
  baseURL:
    'https://affiliate-public-service-prod.ol.epicgames.com/affiliate/api/public/affiliates',
})

affiliateService.interceptors.request.use(async (config) => {
  const userAgent = await Manifest.getUserAgent()

  config.headers.setUserAgent(userAgent)

  return config
})
