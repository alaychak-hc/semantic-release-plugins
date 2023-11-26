// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 04:37:40 PM
  Last Modified: 11-25-2023 05:20:36 PM
  Last Updated By: Andrew Laychak
  
  Description: Contains types with Semantic Release options (by extending the context).
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { Options, PrepareContext } from 'semantic-release';
// #endregion

// #region Prepare
type PrepareContextWithOptions = PrepareContext & {
  options: Options;
};
// #endregion

// #region Exports
export type { PrepareContextWithOptions };
// #endregion
