// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-25-2023 12:53:15 AM
  Last Modified: 11-25-2023 12:53:21 AM
  Last Updated By: Andrew Laychak
  
  Description: Determines if a message can be sent to MS Teams.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { SuccessContextWithOptions } from './interfaces/with-options';
// #endregion

// #region Can Notify
function canNotify(context: SuccessContextWithOptions) {
  const { env, options, logger } = context;

  // eslint-disable-next-line no-restricted-syntax
  if (options.plugins === undefined) {
    return true;
  }

  for (const plugin of options.plugins) {
    const hasCustomGitPlugin =
      Array.isArray(plugin) &&
      typeof plugin[0] === 'string' &&
      plugin[0] === '@semantic-release/git';

    const hasDefaultGitPlugin =
      typeof plugin === 'string' && plugin === '@semantic-release/git';

    if (
      (hasDefaultGitPlugin || hasCustomGitPlugin) &&
      env.HAS_PREVIOUS_SEM_REL_EXECUTION.toString() === 'true'
    ) {
      logger.warn(
        'The @semantic-release/git plugin has been detected, and it seems a message has already been sent to Teams. No other message will be issued.'
      );
      return false;
    }
  }

  return true;
}
// #endregion

// #region Exports
export { canNotify };
// #endregion
