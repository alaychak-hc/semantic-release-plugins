// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 04:37:40 PM
  Last Modified: 11-24-2023 06:36:41 PM
  Last Updated By: Andrew Laychak
  
  Description: Contains types with Semantic Release options (by extending the context).
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import {
  AnalyzeCommitsContext,
  GenerateNotesContext,
  Options,
  SuccessContext,
  VerifyReleaseContext,
} from 'semantic-release';
// #endregion

type AnalyzeCommitContextWithOptions = AnalyzeCommitsContext & {
  options: Options;
};

// #region Generate Notes
type GenerateNotesContextWithOptions = GenerateNotesContext & {
  options: Options;
};
// #endregion

// #region Success
type SuccessContextWithOptions = SuccessContext & {
  options: Options;
};
// #endregion

// #region Verify Release
type VerifyReleaseContextWithOptions = VerifyReleaseContext & {
  options: Options;
};
// #endregion

// #region Exports
export type {
  AnalyzeCommitContextWithOptions,
  VerifyReleaseContextWithOptions,
  GenerateNotesContextWithOptions,
  SuccessContextWithOptions,
};
// #endregion
