// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-25-2023 12:53:15 AM
  Last Modified: 11-25-2023 01:25:51 AM
  Last Updated By: Andrew Laychak
  
  Description: Determines if a release notes were already modified
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { SuccessContextWithOptions } from './interfaces/with-options.js';
// #endregion

// #region Can Notify
function canModify(context: SuccessContextWithOptions) {
  const { options, logger } = context;

  if (options.plugins === undefined) {
    return true;
  }

  let modifyResult = true;
  for (const plugin of options.plugins) {
    let pluginName: string;

    if (Array.isArray(plugin)) {
      pluginName = plugin[0];
    } else {
      pluginName = plugin;
    }

    if (pluginName === '@semantic-release/git') {
      console.log(
        'HAS PREVIOUS SEM REL EXECUTION: ',
        process.env.HAS_PREVIOUS_SEM_REL_EXECUTION
      );

      if (process.env.HAS_PREVIOUS_SEM_REL_EXECUTION === 'true') {
        logger.warn(
          'The @semantic-release/git plugin has been detected, and it seems this plugin has already modified the release notes. No further modifications will be made'
        );

        modifyResult = false;
        break;
      }
    }
  }

  return modifyResult;
  // for (const plugin of options.plugins) {
  //   const hasCustomGitPlugin =
  //     Array.isArray(plugin) &&
  //     typeof plugin[0] === 'string' &&
  //     plugin[0] === '@semantic-release/git';

  //   const hasDefaultGitPlugin =
  //     typeof plugin === 'string' && plugin === '@semantic-release/git';

  //   console.log(
  //     'HAS PREVIOUS SEM REL EXECUTION: ',
  //     env.HAS_PREVIOUS_SEM_REL_EXECUTION
  //   );

  //   if (
  //     (hasDefaultGitPlugin || hasCustomGitPlugin) &&
  //     env.HAS_PREVIOUS_SEM_REL_EXECUTION === 'true'
  //   ) {
  //     logger.warn(
  //       'The @semantic-release/git plugin has been detected, and it seems this plugin has already modified the release notes. No further modifications will be made'
  //     );

  //     return false;
  //   }
  // }
  // return true;
}
// #endregion

// #region Exports
export { canModify };
// #endregion
