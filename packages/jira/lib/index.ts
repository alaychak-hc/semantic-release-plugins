// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:52:32 PM
  Last Modified: 11-25-2023 06:24:10 PM
  Last Updated By: Andrew Laychak
  
  Description: Main index file that will send a release note to MS Teams.

  Notes:
    - In dry run, this will not update the [JIRA-XYZ] links in the release notes. This is because the release notes are not generated until the prepare step. I can't update it in generateNotes step because returning the new value will concatenate the values from other plugins. This is a limitation of Semantic Release (as of 11/24/2023). The notes are properly update when not in dry run.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { verifyConfiguration } from './verify-config.js';
import { PluginOptions } from './interfaces/plugin-options.js';
import { VerifyConditionsContext } from 'semantic-release';
import { PrepareContextWithOptions } from './interfaces/with-options.js';
import { prepareNotes } from './prepare-notes.js';
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
const prepare = async (
  pluginConfig: PluginOptions,
  context: PrepareContextWithOptions
) => {
  if (verified) {
    await prepareNotes(pluginConfig, context);
  }
};
// #endregion

// #region Exports
export { verifyConditions, prepare };
// #endregion
