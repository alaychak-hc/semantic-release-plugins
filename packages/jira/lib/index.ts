// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:52:32 PM
  Last Modified: 11-24-2023 05:36:00 PM
  Last Updated By: Andrew Laychak
  
  Description: Main index file that will send a release note to MS Teams.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { verifyConfiguration } from './verify-config.js';
import { PluginOptions } from './interfaces/plugin-options.js';
import { VerifyConditionsContext } from 'semantic-release';
import { GenerateNotesContextWithOptions } from './interfaces/with-options.js';
import { jiraGenerateNotes } from './generate-notes.js';
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
  if (verified) {
    jiraGenerateNotes(pluginConfig, context);
  }
};
// #endregion

// #region Exports
export { verifyConditions, generateNotes };
// #endregion
