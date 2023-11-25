// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-01-2022 09:48:49 AM
    Last Modified: 11-24-2023 06:43:40 PM
    Last Updated By: Andrew Laychak

    Description: 

    References:
      - None
 ********************************************
*/
// #endregion

import { generateNotes } from '@semantic-release/release-notes-generator';
import getCommitFilesByPackage from './commit-hashes.js';
import { PluginOptions } from './interfaces/plugin-options.js';
import { GenerateNotesContextWithOptions } from './interfaces/with-options.js';

// #region Analyze
async function generate(
  pluginConfig: PluginOptions,
  context: GenerateNotesContextWithOptions
): Promise<string> {
  const { includeAll, name } = pluginConfig;

  const newContext = context;

  if (includeAll !== true) {
    const finalFiles: Set<string> = await getCommitFilesByPackage(
      pluginConfig,
      context
    );

    newContext.commits = newContext.commits.filter((f) =>
      finalFiles.has(f.hash)
    );
  } else {
    newContext.commits = newContext.commits.filter(
      (f) => f.author.name !== 'semantic-release-bot'
    );
  }

  newContext.nextRelease.version = `${name} - v${newContext.nextRelease.version}`;
  const releaseNotes = await generateNotes(pluginConfig, newContext);

  return releaseNotes;
}
// #endregion

// #region Exports
export { generate };
// #endregion
