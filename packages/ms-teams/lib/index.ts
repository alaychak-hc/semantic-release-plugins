// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:52:32 PM
  Last Modified: 11-22-2024 09:42:26 PM
  Last Updated By: Andrew Laychak
  
  Description: Main index file that will send a release note to MS Teams.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { verifyConfiguration } from './verify-config.js';
import { sendMessage } from './send-message.js';
import { PluginOptions } from './interfaces/plugin-options.js';
import { VerifyConditionsContext } from 'semantic-release';
import {
  GenerateNotesContextWithOptions,
  SuccessContextWithOptions,
} from './interfaces/with-options.js';
import { canNotify } from './can-notify.js';
// #endregion

// #region Variables
let verified = false;
// #endregion

// #region Verify Conditions
const verifyConditions = (
  pluginConfig: PluginOptions,
  context: VerifyConditionsContext
) => {
  verifyConfiguration(pluginConfig, context);

  verified = true;
};
// #endregion

// #region Generate Notes
const generateNotes = async (
  pluginConfig: PluginOptions,
  context: GenerateNotesContextWithOptions
) => {
  const { options } = context;
  const isDryRunMode = options.dryRun === true;
  const notifyInDryRun = pluginConfig.notifyInDryRun ?? true;

  if (isDryRunMode && notifyInDryRun) {
    await success(pluginConfig, context);
  }
};
// #endregion

// #region Success
const success = async (
  pluginConfig: PluginOptions,
  context: SuccessContextWithOptions
) => {
  if (verified && canNotify(context)) {
    await sendMessage(pluginConfig, context);
  }
};
// #endregion

// #region Exports
export { verifyConditions, generateNotes, success };
// #endregion
