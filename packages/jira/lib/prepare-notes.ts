// #region Imports
import { generateNotes } from '@semantic-release/release-notes-generator';
import { PluginOptions } from './interfaces/plugin-options.js';
import { PrepareContextWithOptions } from './interfaces/with-options.js';
// #endregion

const ISSUE_REGEX = /(\[)?([A-Z][A-Z0-9]{0,50}-[1-9][0-9]*)(\])?/g;

// #region Prepare Notes
async function prepareNotes(
  pluginConfig: PluginOptions,
  context: PrepareContextWithOptions
) {
  const { jiraHost, ticketPrefixes } = pluginConfig;

  let notes = await generateNotes(pluginConfig, context);
  let { nextRelease } = context;
  if (nextRelease && nextRelease.notes) {
    notes = nextRelease.notes;
  }

  let issueRegex;

  if (!ticketPrefixes) {
    issueRegex = new RegExp(ISSUE_REGEX, 'g');
  } else if (ticketPrefixes.length > 0) {
    // issueRegex = new RegExp(`((${ticketPrefixes.join('|')})-[1-9][0-9]*)`, 'g');
    issueRegex = new RegExp(
      `(\\[)?(${ticketPrefixes.join('|')}-[1-9][0-9]*)(\\])?`,
      'g'
    );
  } else {
    return notes;
  }

  const newNotes = notes?.replace(
    issueRegex,
    (_match, bracketStart, issue, bracketEnd) => {
      const markdownLink = `[${issue}](${jiraHost}/browse/${issue})`;
      return bracketStart && bracketEnd ? `[${markdownLink}]` : markdownLink;
    }
  );

  process.env.NEW_RELEASE_NOTES = newNotes;
}
// #endregion

// #region Exports
export { prepareNotes };
// #endregion
