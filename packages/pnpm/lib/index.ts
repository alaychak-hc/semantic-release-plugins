// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:52:32 PM
  Last Modified: 11-25-2023 09:38:54 PM
  Last Updated By: Andrew Laychak
  
  Description: Main index file that will send a release note to MS Teams.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { generate } from './generate-notes.js';
import { PluginOptions } from './interfaces/plugin-options.js';
import {
  AnalyzeCommitContextWithOptions,
  GenerateNotesContextWithOptions,
} from './interfaces/with-options.js';
import { analyze } from './analyze.js';
// #endregion

// #region Verify Conditions
async function analyzeCommits(
  pluginConfig: PluginOptions,
  context: AnalyzeCommitContextWithOptions
) {
  return analyze(pluginConfig, context);
}
// #endregion

// #region Generate Notes
async function generateNotes(
  pluginConfig: PluginOptions,
  context: GenerateNotesContextWithOptions
) {
  const hasPreviouslyExecuted =
    process.env.HAS_PREVIOUS_SEM_REL_EXECUTION === 'true';

  if (hasPreviouslyExecuted === false) {
    return generate(pluginConfig, context);
  }
}
// #endregion

// #region Exports
export { analyzeCommits, generateNotes };
// #endregion
