// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:41:25 PM
  Last Modified: 11-22-2024 09:54:54 PM
  Last Updated By: Andrew Laychak
  
  Description: Type for the plugin options.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Plugin Options
type PluginOptions = {
  host: string;
  ticketPrefixes?: string[];
};
// #endregion

// #region Exports
export type { PluginOptions };
// #endregion
