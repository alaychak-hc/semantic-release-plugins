// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 01:18:47 AM
  Last Modified: 11-22-2024 09:40:01 PM
  Last Updated By: Andrew Laychak
  
  Description: Sends a message to Microsoft Teams.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { VerifyReleaseContext } from 'semantic-release';
// import { PluginOptions } from './interfaces/plugin-options.js';
// import { toMarkdown } from 'mdast-util-to-markdown';
import { remark } from 'remark';
// import {
//   Fact,
//   MicrosoftTeamsConnectorCard,
// } from './interfaces/connector-card.js';
import { VerifyReleaseContextWithOptions } from './interfaces/with-options.js';
// import * as emoji from 'node-emoji';
import * as path from 'path';
import { create } from 'express-handlebars';
import handlebars from 'handlebars';
import slash from 'slash';
import type { AdaptiveCard } from './interfaces/adaptive-card.js';
import fs from 'fs/promises';
// #endregion

// #region Emojis
async function loadEmojis(): Promise<Record<string, string>> {
  const data = await fs.readFile(
    path.join(import.meta.dirname, 'emojis.json'),
    'utf-8'
  );
  return JSON.parse(data);
}

const emojis = await loadEmojis();
const emojiRegex = /:([a-zA-Z0-9_+-]+):/g;

function replaceEmojis(text: string): string {
  return text.replace(
    emojiRegex,
    (
      match: string,
      p1: string,
      _offset: number,
      _wholeString: string
    ): string => {
      if (p1 in emojis) {
        const emojiUrl = emojis[p1 as keyof typeof emojis];
        const unicodeMatch = emojiUrl.match(/unicode\/([\dA-Fa-f-]+)\.png/);
        if (!unicodeMatch) {
          return match;
        }

        const codePoints = unicodeMatch[1]
          .split('-')
          .map((cp) => parseInt(cp, 16));

        const emoji = String.fromCodePoint(...codePoints);
        return emoji;
      } else {
        return match;
      }
    }
  );
}
// #endregion

// #region Handlebars
const currentTemplatesDirectory = path.join(import.meta.dirname, 'templates');
const viewInstance = create({
  layoutsDir: currentTemplatesDirectory,
  extname: '.hbs',
  handlebars: handlebars.create(),
});
// #endregion

// #region Generate Microsoft Teams Message
async function generateMicrosoftTeamsMessage(data: AdaptiveCard) {
  const groupTitleTemplatePath = slash(
    path.join(import.meta.dirname, 'templates/adaptive-card.hbs')
  );

  const renderedTemplate = await viewInstance.render(groupTitleTemplatePath, {
    ...data,
  });

  return JSON.parse(renderedTemplate);
}
// #endregion

// #region Base Message
// function baseMessage(
//   pluginConfig: PluginOptions,
//   context: VerifyReleaseContextWithOptions
// ): MicrosoftTeamsConnectorCard {
//   const { nextRelease, lastRelease, commits, options, logger } = context;
//   const repository = options.repositoryUrl?.split('/').pop();
//   const { title, imageUrl, showContributors } = pluginConfig;

//   const isDryRunMode = options.dryRun === true;

//   const facts: Fact[] = [];
//   let summary = title ?? 'A new version has been released';
//   const nextVersion = `${nextRelease.gitTag} (${nextRelease.type})`;

//   if (isDryRunMode) {
//     logger.info(
//       'Sending release notes in dry-run mode. Set "notifyInDryRun" option to false to disable.'
//     );

//     summary += ' [DRY-RUN MODE]';
//   }

//   facts.push({
//     name: 'Version',
//     value: nextVersion,
//   });

//   if (Object.keys(lastRelease).length > 0) {
//     facts.push({ name: 'Last Release', value: lastRelease.gitTag });
//   }

//   facts.push({ name: 'Commits', value: commits.length });

//   if (
//     commits.length > 0 &&
//     (showContributors || showContributors === undefined)
//   ) {
//     // prettier-ignore
//     const contributors = commits
//       .map(commit => commit.author.email)
//       .reduce(
//         (accumulator, email) => accumulator.add(email.substring(0, email.indexOf('@'))),
//         new Set()
//       )

//     facts.push({
//       name: 'Contributors',
//       value: Array.from(contributors).join(', '),
//     });
//   }

//   return {
//     '@type': 'MessageCard',
//     '@context': 'http://schema.org/extensions',
//     themeColor: 'FC6D27',
//     summary,
//     sections: [
//       {
//         activityTitle: summary,
//         activitySubtitle: repository,
//         activityImage:
//           imageUrl ||
//           'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Gitlab_meaningful_logo.svg/144px-Gitlab_meaningful_logo.svg.png',
//         facts,
//         markdown: true,
//       },
//     ],
//   };
// }
// #endregion

// #region Extract Sections
function extractSections(context: VerifyReleaseContext) {
  let adaptiveCard: AdaptiveCard = {
    title: '',
    sections: [],
  };
  const tree = remark.parse(context.nextRelease.notes);
  console.dir(tree, { depth: null });

  for (let i = 0; i < tree.children.length - 1; i++) {
    const child = tree.children[i];
    const nextChild = tree.children[i + 1];

    if (child.type === 'heading' && child.depth === 1) {
      const firstChild = child.children[0];
      if (firstChild.type === 'link') {
        if (firstChild.children[0].type === 'text') {
          adaptiveCard.title = `[${firstChild.children[0].value}](${firstChild.url})`;

          const nextChild =
            child.children.length === 2 ? child.children[1] : undefined;
          if (nextChild?.type === 'text') {
            adaptiveCard.title += nextChild.value;
          }
        }
      }
    }

    if (
      child.type === 'heading' &&
      child.depth === 2 &&
      child.children[0].type === 'text'
    ) {
      adaptiveCard.sections.push({
        type: replaceEmojis(child.children[0].value),
        scopes: [],
      });
    }

    if (
      child.type === 'heading' &&
      child.depth === 3 &&
      child.children[0].type === 'text'
    ) {
      adaptiveCard.sections[adaptiveCard.sections.length - 1].scopes.push({
        title: child.children[0].value,
        items: [],
      });
    }

    if (
      child.type === 'heading' &&
      child.depth === 4 &&
      child.children[0].type === 'text' &&
      nextChild.type === 'list' &&
      nextChild.children.length > 0
    ) {
      const section = adaptiveCard.sections[adaptiveCard.sections.length - 1];
      const scope = section.scopes[section.scopes.length - 1];

      let commits: string[] = [];
      nextChild.children.forEach((commit) => {
        if (commit.children[0].type === 'paragraph') {
          let commitMessage = '';
          commit.children[0].children.forEach((child) => {
            if (child.type === 'text') {
              commitMessage += child.value;
            } else if (child.type === 'link') {
              if (child.children[0].type === 'text') {
                commitMessage += `[${child.children[0].value}](${child.url})`;
              }
            }
          });

          commits.push(commitMessage);
        }
      });

      scope.items.push({
        title: child.children[0].value,
        commits,
      });
    }
  }

  return adaptiveCard;
}
// #endregion

// #region Teamsify
async function teamsify(
  // pluginConfig: PluginOptions,
  context: VerifyReleaseContextWithOptions
) {
  const sections = extractSections(context);
  const teamsMessage = await generateMicrosoftTeamsMessage(sections);
  // const teamsMessage = baseMessage(pluginConfig, context);

  // if (sections.length > 0) {
  //   teamsMessage.sections.push({ text: '---' });
  // }

  // sections.forEach((section) => {
  //   teamsMessage.sections.push({
  //     text: `## ${emoji.emojify(section.name)}`,
  //   });

  //   if (section.changes) {
  //     teamsMessage.sections.push({
  //       text: `${emoji.emojify(
  //         section.changes.replace('\n-', '\r-')
  //       )}`,
  //     });
  //   }
  // });

  return teamsMessage;
}
// #endregion

// #region Exports
export { teamsify };
// #endregion
