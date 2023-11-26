// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-01-2022 09:48:49 AM
    Last Modified: 11-25-2023 07:07:50 PM
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
  let releaseNotes = await generateNotes(pluginConfig, newContext);

  const { nextRelease } = newContext;
  if (nextRelease && nextRelease.notes) {
    releaseNotes = nextRelease.notes;
  }

  console.log('INITIAL RELEASE NOTES: ', releaseNotes);
  releaseNotes = releaseNotes.replace(
    /\(\[([0-9a-f]{7,40})\]\(https:\/\/github\.com\//g,
    '\\([$1](https://github.com/'
  );

  process.env.HAS_PREVIOUS_SEM_REL_EXECUTION = 'true';
  console.log('NEW RELEASE NOTES: ', releaseNotes);

  return releaseNotes;
}
// #endregion

// #region Exports
export { generate };
// #endregion
