// #region Imports
import { generateNotes } from '@semantic-release/release-notes-generator';
import { PluginOptions } from './interfaces/plugin-options.js';
import { GenerateNotesContextWithOptions } from './interfaces/with-options.js';
// #endregion

const ISSUE_REGEX = /([A-Z][A-Z0-9]{0,50}-[1-9][0-9]*)/;

// #region Generate Notes
async function jiraGenerateNotes(
  pluginConfig: PluginOptions,
  context: GenerateNotesContextWithOptions
) {
  const { jiraHost, ticketPrefixes } = pluginConfig;
  const notes = await generateNotes(pluginConfig, context);

  let issueRegex;

  if (!ticketPrefixes) {
    issueRegex = new RegExp(ISSUE_REGEX, 'g');
  } else if (ticketPrefixes.length > 0) {
    issueRegex = new RegExp(`((${ticketPrefixes.join('|')})-[1-9][0-9]*)`, 'g');
  } else {
    return notes;
  }

  return notes?.replace(issueRegex, `[$1](https://${jiraHost}/browse/$1)`);
}
// #endregion

// #region Exports
export { jiraGenerateNotes };
// #endregion
