import type { Config } from 'payload/config'

import { onInitExtension } from './onInitExtension'
import type { PluginTypes } from './types'
import { extendWebpackConfig } from './webpack'
import Videos from './collections/Videos'
import { handleDeleted } from './webhooks/handleDeleted'

export const muxPlugin =
  (pluginOptions: PluginTypes) =>
    (incomingConfig: Config): Config => {
      let config = { ...incomingConfig }

      const webpack = extendWebpackConfig(incomingConfig)

      config.admin = {
        ...(config.admin || {}),
        webpack,
        components: {
          ...(config.admin?.components || {}),
        },
      }

      // If the plugin is disabled, return the config without modifying it
      // The order of this check is important, we still want any webpack extensions to be applied even if the plugin is disabled
      if (pluginOptions.enabled === false) {
        return config
      }

      config.collections = [
        ...(config.collections || []),
        /* Add our Videos collection */
        Videos,
      ]

      config.endpoints = [
        ...(config.endpoints || []),
        /* When videos are deleted in Mux, this webhook catches the event and deletes the associated document in Payload */
        {
          path: '/api/webhooks/mux',
          method: 'post',
          root: true,
          handler: handleDeleted
        },
      ]

      config.globals = [
        ...(config.globals || []),
        // Add additional globals here
      ]

      config.hooks = {
        ...(config.hooks || {}),
        // Add additional hooks here
      }

      config.onInit = async payload => {
        if (incomingConfig.onInit) await incomingConfig.onInit(payload)
        // Add additional onInit code by using the onInitExtension function
        onInitExtension(pluginOptions, payload)
      }

      return config
    }
