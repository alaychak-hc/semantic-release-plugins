// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 01:18:47 AM
  Last Modified: 11-28-2023 01:30:24 AM
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
import { mergeOptions } from './merged-options.js';
// #endregion

// #region Extract Name From Email
function extractNameFromEmail(email: string) {
  const githubEmailPattern = /^[0-9]+\+([^\@]+)@users\.noreply\.github\.com$/;
  const match = email.match(githubEmailPattern);

  if (match && match[1]) {
    return match[1];
  } else {
    return email.substring(0, email.indexOf('@'));
  }
}
// #endregion

// #region Base Message
function baseMessage(
  pluginConfig: PluginOptions,
  context: VerifyReleaseContextWithOptions
): MicrosoftTeamsConnectorCard {
  const mergedOptions = mergeOptions(pluginConfig);
  const { nextRelease, lastRelease, commits, options, logger } = context;
  const { title, imageUrl, showContributors } = mergedOptions.msTeamsOptions;

  const previousTag = lastRelease.gitTag || lastRelease.gitHead;
  const currentTag = nextRelease.gitTag || nextRelease.gitHead;
  let repositoryUrl = context?.options?.repositoryUrl;
  if (repositoryUrl !== undefined) {
    repositoryUrl = repositoryUrl
      .replace('.git', '')
      .replace('git@github.com:', 'https://github.com/');
  }

  const isDryRunMode = options.dryRun === true;

  const facts: Fact[] = [];
  let summary = title || 'A new version has been released';
  let nextVersion = `${currentTag} (${nextRelease.type})`;

  if (isDryRunMode) {
    logger.info(
      'Sending release notes in dry-run mode. Set "notifyInDryRun" option to false to disable.'
    );

    /* eslint-disable-next-line quotes */
    summary = "[DRY-RUN MODE] This is a preview of the next release's content";
    // nextVersion = `${nextRelease.type} version bump`;
  }

  const nextVersionLink = `${repositoryUrl}/releases/tag/${nextVersion}`;
  facts.push({
    name: 'Version',
    value: `[${nextVersion}](${nextVersionLink})`,
  });

  if (Object.keys(lastRelease).length > 0) {
    const lastReleaseLink = `${repositoryUrl}/releases/tag/${previousTag}`;
    facts.push({
      name: 'Last Release',
      value: `[${previousTag}](${lastReleaseLink})`,
    });
  }

  facts.push({ name: 'Commits', value: commits.length });

  if (
    commits.length > 0 &&
    (showContributors || showContributors === undefined)
  ) {
    // prettier-ignore
    const contributors = commits
      .map(commit => commit.author.email)
      .map((email) => {
        return extractNameFromEmail(email)
      })

    facts.push({
      name: 'Contributors',
      value: Array.from(new Set(contributors)).join(', '),
    });
  }

  const compareLink = `${repositoryUrl}/compare/${previousTag}...${currentTag}`;
  facts.push({
    name: 'Compare',
    value: `[${previousTag}...${currentTag}](${compareLink})`,
  });

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: 'FC6D27',
    summary,
    sections: [
      {
        activityTitle: summary,
        // activitySubtitle: `[Release Notes ${currentTag}](${compareLink})`,
        // activitySubtitle: repository,
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
function extractSections(context: VerifyReleaseContext, releaseNotes?: string) {
  const tree = remark.parse(releaseNotes ?? context.nextRelease.notes);
  const sections = [];

  for (let i = 0; i < tree.children.length - 1; i++) {
    const child = tree.children[i];
    const nextChild = tree.children[i + 1];
    if (
      child.type === 'heading' &&
      child.depth === 2 &&
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
  context: VerifyReleaseContextWithOptions,
  releaseNotes?: string
) {
  const sections = extractSections(context, releaseNotes);
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
