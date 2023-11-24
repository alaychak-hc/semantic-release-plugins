// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:41:25 PM
  Last Modified: 11-24-2023 04:20:13 PM
  Last Updated By: Andrew Laychak
  
  Description: Type for the plugin options.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Plugin Options
type PluginOptions = {
  webhookUrl: string;
  webhookUrlDryRun?: string;
  title?: string;
  imageUrl?: string;
  showContributors?: boolean;
  notifyInDryRun?: boolean;
};
// #endregion

// #region Exports
export type { PluginOptions };
// #endregion
