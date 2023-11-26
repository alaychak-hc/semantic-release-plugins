// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-25-2023 05:40:46 PM
  Last Modified: 11-25-2023 05:40:54 PM
  Last Updated By: Andrew Laychak
  
  Description: Prepares a changelog for the release.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { PluginOptions } from './interfaces/plugin-options.js';
import { PrepareContextWithOptions } from './interfaces/with-options.js';
import { prepareChangelog } from './prepare.js';
// #endregion

// #region Prepare
const prepare = async (
  pluginConfig: PluginOptions,
  context: PrepareContextWithOptions
) => {
  await prepareChangelog(pluginConfig, context);
};
// #endregion

// #region Exports
export { prepare };
// #endregion
