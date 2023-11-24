// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 01:18:47 AM
  Last Modified: 11-24-2023 04:57:04 PM
  Last Updated By: Andrew Laychak
  
  Description: Sends a message to Microsoft Teams.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { VerifyReleaseContext } from 'semantic-release';
import { PluginOptions } from './interfaces/plugin-options.js';
import { toMarkdown } from 'mdast-util-to-markdown';
import { remark } from 'remark';
import {
  Fact,
  MicrosoftTeamsConnectorCard,
} from './interfaces/connector-card.js';
import { VerifyReleaseContextWithOptions } from './interfaces/with-options.js';
import * as emoji from 'node-emoji';
// #endregion

// #region Base Message
function baseMessage(
  pluginConfig: PluginOptions,
  context: VerifyReleaseContextWithOptions
): MicrosoftTeamsConnectorCard {
  const { nextRelease, lastRelease, commits, options, logger } = context;
  const repository = options.repositoryUrl?.split('/').pop();
  const { title, imageUrl, showContributors } = pluginConfig;

  const isDryRunMode = options.dryRun === true;

  const facts: Fact[] = [];
  let summary, nextVersion;

  if (isDryRunMode) {
    logger.info(
      'Sending release notes in dry-run mode. Set "notifyInDryRun" option to false to disable.'
    );

    /* eslint-disable-next-line quotes */
    summary = "[DRY-RUN MODE] This is a preview of the next release's content";
    nextVersion = `${nextRelease.type} version bump`;
  } else {
    summary = title || 'A new version has been released';
    nextVersion = `${nextRelease.gitTag} (${nextRelease.type})`;
  }

  facts.push({
    name: 'Version',
    value: nextVersion,
  });

  if (Object.keys(lastRelease).length > 0) {
    facts.push({ name: 'Last Release', value: lastRelease.gitTag });
  }

  facts.push({ name: 'Commits', value: commits.length });

  if (
    commits.length > 0 &&
    (showContributors || showContributors === undefined)
  ) {
    // prettier-ignore
    const contributors = commits
      .map(commit => commit.author.email)
      .reduce(
        (accumulator, email) => accumulator.add(email.substring(0, email.indexOf('@'))),
        new Set()
      )

    facts.push({
      name: 'Contributors',
      value: Array.from(contributors).join(', '),
    });
  }

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: 'FC6D27',
    summary,
    sections: [
      {
        activityTitle: summary,
        activitySubtitle: repository,
        activityImage:
          imageUrl ||
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Gitlab_meaningful_logo.svg/144px-Gitlab_meaningful_logo.svg.png',
        facts,
        markdown: true,
      },
    ],
  };
}
// #endregion

// #region Extract Sections
function extractSections(context: VerifyReleaseContext) {
  const tree = remark.parse(context.nextRelease.notes);
  const sections = [];

  for (let i = 0; i < tree.children.length - 1; i++) {
    const child = tree.children[i];
    const nextChild = tree.children[i + 1];
    if (
      child.type === 'heading' &&
      child.depth === 3 &&
      child.children[0].type === 'text' &&
      nextChild.type === 'list' &&
      nextChild.children.length > 0
    ) {
      sections.push({
        name: child.children[0].value,
        changes: toMarkdown(
          { type: 'root', children: [nextChild] },
          {
            bullet: '-',
            emphasis: '_',
          }
        ),
      });
    }
  }

  return sections;
}
// #endregion

// #region Teamsify
async function teamsify(
  pluginConfig: PluginOptions,
  context: VerifyReleaseContextWithOptions
) {
  const sections = extractSections(context);
  const teamsMessage = baseMessage(pluginConfig, context);

  if (sections.length > 0) {
    teamsMessage.sections.push({ text: '---' });
  }

  sections.forEach((section) => {
    teamsMessage.sections.push({ text: `## ${emoji.emojify(section.name)}` });
    teamsMessage.sections.push({
      text: emoji.emojify(section.changes.replace('\n-', '\r-')),
    });
  });

  return teamsMessage;
}
// #endregion

// #region Exports
export { teamsify };
// #endregion
