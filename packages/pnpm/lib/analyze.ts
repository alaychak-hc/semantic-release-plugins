// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 06:30:43 PM
  Last Modified: 11-08-2024 12:07:30 PM
  Last Updated By: Andrew Laychak
  
  Description: Analyze commits for semantic release.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { getCommitFilesByPackage } from './commit-hashes.js';
import { PluginOptions } from './interfaces/plugin-options.js';
import { AnalyzeCommitContextWithOptions } from './interfaces/with-options.js';
// #endregion

// #region Analyze
async function analyze(
  pluginConfig: PluginOptions,
  context: AnalyzeCommitContextWithOptions
) {
  const finalFiles: Set<string> = await getCommitFilesByPackage(context);

  const newContext = context;
  newContext.commits = newContext.commits.filter((f) => finalFiles.has(f.hash));

  const semanticVersionNumber = await analyzeCommits(pluginConfig, newContext);
  return semanticVersionNumber;
}
// #endregion

// #region Exports
export { analyze };
// #endregion
