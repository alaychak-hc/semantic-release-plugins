// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 01:17:22 AM
  Last Modified: 11-22-2024 03:23:12 PM
  Last Updated By: Andrew Laychak
  
  Description: Sends a message to Microsoft Teams.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { teamsify } from './teamsify.js';
import { PluginOptions } from './interfaces/plugin-options.js';
import { SuccessContextWithOptions } from './interfaces/with-options.js';
// #endregion

// #region Get URL
function getUrl(
  pluginConfig: PluginOptions,
  context: SuccessContextWithOptions
) {
  const notifyInDryRun = pluginConfig.notifyInDryRun ?? true;
  const { dryRun } = context.options;
  const { webhookUrl: urlConfig, webhookUrlDryRun: dryRunUrlConfig } =
    pluginConfig;
  const {
    TEAMS_WEBHOOK_URL: urlEnvironment,
    TEAMS_WEBHOOK_URL_DRY_RUN: dryRunUrlEnvironment,
  } = context.env;

  if (dryRun && notifyInDryRun) {
    if (dryRunUrlConfig) {
      return dryRunUrlConfig;
    }

    if (!dryRunUrlConfig && dryRunUrlEnvironment) {
      return dryRunUrlEnvironment;
    }

    if (!dryRunUrlConfig && !dryRunUrlEnvironment && urlConfig) {
      return urlConfig;
    }

    if (
      !dryRunUrlConfig &&
      !dryRunUrlEnvironment &&
      !urlConfig &&
      urlEnvironment
    ) {
      return urlEnvironment;
    }
  } else {
    return urlConfig ? urlConfig : urlEnvironment;
  }
}
// #endregion

// #region Send Message
async function sendMessage(
  pluginConfig: PluginOptions,
  context: SuccessContextWithOptions
) {
  const { logger, env } = context;
  const url = getUrl(pluginConfig, context);

  const headers = { 'Content-Type': 'application/json' };
  let body;
  let teamsifyError = false;

  try {
    const data = await teamsify(context);
    body = JSON.stringify({
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: data,
        },
      ],
    });
    // body = JSON.stringify(await teamsify(pluginConfig, context));
  } catch (e) {
    const message = 'An error occurred while parsing the release notes.';
    logger.error(message);
    logger.error(e);
    teamsifyError = true;
  }

  if (!teamsifyError) {
    fetch(url ?? '', { method: 'post', body, headers })
      .then(() => logger.log('Message sent to Microsoft Teams'))
      .catch((error) =>
        logger.error(
          'An error occurred while sending the message to Teams',
          error
        )
      )
      .finally(() => {
        env.HAS_PREVIOUS_EXECUTION = 'true';
      });
  }
}
// #endregion

// #region Exports
export { sendMessage };
// #endregion
