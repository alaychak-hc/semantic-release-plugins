// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-25-2023 05:19:54 PM
  Last Modified: 11-25-2023 06:25:45 PM
  Last Updated By: Andrew Laychak
  
  Description: The prepare step of the changelog plugin.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import path from 'path';
import { PluginOptions } from './interfaces/plugin-options';
import { PrepareContextWithOptions } from './interfaces/with-options';
import fsExtra from 'fs-extra';
// #endregion

// #region Expands
const { readFile, writeFile, ensureFile } = fsExtra;
// #endregion

// #region Prepare Changelog
async function prepareChangelog(
  pluginConfig: PluginOptions,
  context: PrepareContextWithOptions
) {
  const { cwd, nextRelease, logger } = context;
  const { notes } = nextRelease;

  const newNotes = process.env.NEW_RELEASE_NOTES ?? notes;

  const { changelogFile, changelogTitle } = pluginConfig;
  let newChangelogFile =
    changelogFile === undefined ? 'CHANGELOG.md' : changelogFile;
  const changelogPath = path.resolve(cwd ?? '', newChangelogFile);

  if (newNotes) {
    await ensureFile(changelogPath);
    const currentFile = (await readFile(changelogPath)).toString().trim();

    if (currentFile) {
      logger.log('Update %s', changelogPath);
    } else {
      logger.log('Create %s', changelogPath);
    }

    const currentContent =
      changelogTitle && currentFile.startsWith(changelogTitle)
        ? currentFile.slice(changelogTitle.length).trim()
        : currentFile;
    const content = `${newNotes.trim()}\n${
      currentContent ? `\n${currentContent}\n` : ''
    }`;

    await writeFile(
      changelogPath,
      changelogTitle ? `${changelogTitle}\n\n${content}` : content
    );
  }
}
// #endregion

// #region Exports
export { prepareChangelog };
// #endregion
