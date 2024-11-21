// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:52:32 PM
  Last Modified: 11-06-2024 11:58:25 AM
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
  SuccessContextWithOptions,
} from './interfaces/with-options.js';
import { analyze } from './analyze.js';
import { execaCommandSync } from 'execa';
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

  context.logger.log(`Has previously executed: ${hasPreviouslyExecuted}`);

  if (hasPreviouslyExecuted === false) {
    return generate(pluginConfig, context);
  } else {
    context.logger.log('Skipping generate notes because it has already run.');

    return context.nextRelease.notes;
  }
}
// #endregion

// #region Prepare
const prepare = async (
  pluginConfig: PluginOptions,
  context: SuccessContextWithOptions
) => {
  const { commandOptions } = pluginConfig;
  if (!commandOptions) {
    return;
  }

  if (commandOptions.prepare) {
    commandOptions.prepare.forEach((command) => {
      context.logger.log(`Running command: ${command}`);
      execaCommandSync(command, { stdio: 'inherit' });
    });
  }
};
// #endregion

// #region Exports
export { analyzeCommits, generateNotes, prepare };
// #endregion
