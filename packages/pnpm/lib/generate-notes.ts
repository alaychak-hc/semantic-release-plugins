// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-01-2022 09:48:49 AM
    Last Modified: 11-27-2023 04:25:51 PM
    Last Updated By: Andrew Laychak

    Description: 

    References:
      - None
 ********************************************
*/
// #endregion

// #region Imports
import { Commit } from 'semantic-release';
import getCommitFilesByPackage from './commit-hashes.js';
import {
  // CommitOptions,
  GroupOptions,
  JiraOptions,
  PluginOptions,
  TitleOptions,
} from './interfaces/plugin-options.js';
import { GenerateNotesContextWithOptions } from './interfaces/with-options.js';
import conventionalCommitsParser from 'conventional-commits-parser';
import handlebars from 'handlebars';
import { create } from 'express-handlebars';
import { getDirectory } from './utilities/folder-path.js';
import slash from 'slash';
import path from 'path';
import { format } from 'date-fns';
import pMap from 'p-map';
import * as emoji from 'node-emoji';
import merge from 'deepmerge';
import fs from 'fs-extra';
// import { simpleGit, CleanOptions } from 'simple-git';
// #endregion

type ChangelogData = {
  [key: string]: {
    title: string;
    commits: string[];
  }[];
};

type GroupCommitDetails = {
  commit: Commit;
  ccCommit: conventionalCommitsParser.Commit;
};

type GroupBase = {
  id: string;
  title: string;
  commits: GroupCommitDetails[];
};

type Group = GroupBase & {
  commits: GroupCommitDetails[];
};

type GroupByScope = GroupBase & {
  scope: string;
  commits: GroupCommitDetails[];
};

const changelogData: ChangelogData = {};
const groupedCommits: Group[] = [];
const groupedCommitsByScope: GroupByScope[] = [];

const defaultOptions = {
  includeAll: false,
  titleOptions: {
    name: 'Release Notes',
    includeCompareLink: true,
    date: 'yyyy-MM-dd',
  },
  commitOptions: {
    groupByScope: true,
    groups: [
      {
        id: 'fixes',
        type: 'fix',
        section: ':bug: Fixes',
      },
      {
        id: 'refactor',
        type: 'refactor',
        section: ':bug: Refactor',
      },
      {
        id: 'documentation',
        type: 'docs',
        section: ':sparkles: Documentation',
      },
      {
        id: 'build',
        type: 'build',
        section: ':building_construction: Build',
      },
      {
        id: 'chores',
        type: 'chore',
        section: ':sparkles: Chores',
      },
    ],
  },
  sort: {
    groups: ['fixes', 'refactor', 'documentation', 'build', 'chores'],
    commits: ['fix', 'refactor', 'docs', 'build', 'chore'],
  },
};

const viewInstance = create({
  layoutsDir: `${getDirectory(import.meta.url)}/templates`,
  extname: '.hbs',
  handlebars: handlebars.create(),
  helpers: {},
});

function mergeOptions(options: PluginOptions) {
  let mergedOptions = merge(defaultOptions, options, {
    arrayMerge: (_destinationArray, sourceArray) => sourceArray,
  });

  mergedOptions.titleOptions = {
    ...mergedOptions.titleOptions,
    date: format(new Date(), mergedOptions.titleOptions.date),
  };

  return mergedOptions;
}

// #region Title
async function getTitle(
  titleOptions: TitleOptions,
  context: GenerateNotesContextWithOptions
) {
  const { lastRelease, nextRelease } = context;
  const { version } = nextRelease;

  const previousTag = lastRelease.gitTag || lastRelease.gitHead;
  const currentTag = nextRelease.gitTag || nextRelease.gitHead;
  const compareLink = `https://github.com/alaychak-hc/SecureConnect-API2/compare/${previousTag}...${currentTag}`;

  const titleTemplatePath = slash(
    path.join(getDirectory(import.meta.url), 'templates/title.hbs')
  );

  const renderedTemplate = await viewInstance.render(titleTemplatePath, {
    ...titleOptions,
    version,
    compareLink,
  });

  return renderedTemplate;
}
// #endregion

async function formatGroupTitle(title: string) {
  const groupTitleTemplatePath = slash(
    path.join(getDirectory(import.meta.url), 'templates/group-title.hbs')
  );

  const renderedTemplate = await viewInstance.render(groupTitleTemplatePath, {
    title,
  });

  return emoji.emojify(renderedTemplate);
}

function findMatchingGroup(
  objectToMatch: conventionalCommitsParser.Commit,
  groups: GroupOptions[]
): GroupOptions | undefined {
  for (const group of groups) {
    if (
      group.type === objectToMatch.type &&
      group.scope === objectToMatch.scope
    ) {
      return group;
    }
  }

  return groups.find((group) => group.type === objectToMatch.type);
}

function sortChangelogData(
  data: ChangelogData,
  sortOrder: string[]
): ChangelogData {
  const sortedData: ChangelogData = {};

  sortOrder.forEach((key) => {
    if (data[key]) {
      sortedData[key] = data[key];
    }
  });

  Object.keys(data).forEach((key) => {
    if (!sortOrder.includes(key)) {
      sortedData[key] = data[key];
    }
  });

  return sortedData;
}

function convertJiraIssuesToLink(jiraOptions: JiraOptions, text: string) {
  const ISSUE_REGEX = /(?:\[)?([A-Z][A-Z0-9]{0,50}-[1-9][0-9]*)(?:\])?/g;
  const { host, ticketPrefixes } = jiraOptions;

  let issueRegex;

  if (!ticketPrefixes) {
    issueRegex = new RegExp(ISSUE_REGEX, 'g');
  } else if (ticketPrefixes.length > 0) {
    issueRegex = new RegExp(
      `(\\[)?(${ticketPrefixes.join('|')}-[1-9][0-9]*)(\\])?`,
      'g'
    );
  } else {
    return text;
  }

  const newText = text?.replace(
    issueRegex,
    (_match, bracketStart, issue, bracketEnd) => {
      const markdownLink = `[${issue}](https://${host}/browse/${issue})`;
      return bracketStart && bracketEnd ? `[${markdownLink}]` : markdownLink;
    }
  );

  return newText;
}

async function getCommit(
  commit: GroupCommitDetails,
  jiraOptions?: JiraOptions
  // _commitOptions: CommitOptions,
  // _context: GenerateNotesContextWithOptions
) {
  const titleTemplatePath = slash(
    path.join(getDirectory(import.meta.url), 'templates/commit.hbs')
  );

  let renderedTemplate = await viewInstance.render(titleTemplatePath, {
    commit,
  });

  if (jiraOptions) {
    renderedTemplate = convertJiraIssuesToLink(jiraOptions, renderedTemplate);
  }

  return emoji.emojify(renderedTemplate);
}

async function parseCommit(commit: Commit, options: PluginOptions) {
  const commitDetails = conventionalCommitsParser.sync(commit.subject);
  const isGroupByScope = options.commitOptions?.groupByScope;

  if (isGroupByScope === true) {
    const findGroup = groupedCommitsByScope.find(
      (group) => group.scope === commitDetails.scope
    );

    if (findGroup) {
      findGroup.commits.push({
        commit,
        ccCommit: commitDetails,
      });
    } else {
      if (commitDetails.scope) {
        let newScopeTitle =
          options.titleOptions?.groups?.[commitDetails.scope] ||
          commitDetails.scope;

        groupedCommitsByScope.push({
          id: commitDetails.scope,
          title: newScopeTitle,
          scope: commitDetails.scope,
          commits: [
            {
              commit,
              ccCommit: commitDetails,
            },
          ],
        });
      }
    }
  } else {
    const matchingGroup = findMatchingGroup(
      commitDetails,
      options.commitOptions?.groups || []
    );

    if (matchingGroup) {
      const findGroup = groupedCommits.find(
        (group) => group.id === matchingGroup.id
      );

      if (findGroup) {
        findGroup.commits.push({
          commit,
          ccCommit: commitDetails,
        });
      } else {
        groupedCommits.push({
          id: matchingGroup.id,
          title: matchingGroup.section,
          commits: [
            {
              commit,
              ccCommit: commitDetails,
            },
          ],
        });
      }
    }
  }
}

// #region Generate
async function generate(
  pluginConfig: PluginOptions,
  context: GenerateNotesContextWithOptions
): Promise<string> {
  const { includeAll } = pluginConfig;
  const newContext = context;

  const options = mergeOptions(pluginConfig);

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

  const releaseNotesTitle = await getTitle(options.titleOptions, newContext);
  let releaseNotes = releaseNotesTitle;

  const getCommitData = async (commit: Commit) => {
    await parseCommit(commit, options);
  };

  await pMap(context.commits, getCommitData, {
    concurrency: 1,
  });

  const uniqueScopes = new Set<string>();
  const updateGroupTitle = async (group: Group | GroupByScope) => {
    // console.log('GROUP: ', JSON.stringify(group, null, 2));
    const formattedGroupTitle = await formatGroupTitle(group.title);
    releaseNotes += `\n\n${formattedGroupTitle}`;

    for (const commit of group.commits) {
      const commitText = await getCommit(commit, pluginConfig.jiraOptions);

      releaseNotes += `\n${commitText}`;

      if (commit.ccCommit.scope) {
        uniqueScopes.add(commit.ccCommit.scope);

        if (!changelogData[commit.ccCommit.scope]) {
          changelogData[commit.ccCommit.scope] = [
            {
              title: formattedGroupTitle,
              commits: [`\n${commitText}`],
            },
          ];
        } else {
          const hasCommitTitle = changelogData[commit.ccCommit.scope].find(
            (group) => group.title === formattedGroupTitle
          );
          if (hasCommitTitle !== undefined) {
            changelogData[commit.ccCommit.scope] = [
              {
                title: formattedGroupTitle,
                commits: [`\n${commitText}`],
              },
            ];
          } else {
            changelogData[commit.ccCommit.scope].push({
              title: `\n${formattedGroupTitle}`,
              commits: [`\n${commitText}`],
            });
          }
        }
      }
    }
  };

  groupedCommits.sort((a, b) => {
    const indexA = options.sort?.groups.indexOf(a.id);
    const indexB = options.sort?.groups.indexOf(b.id);

    if (indexA > indexB) {
      return 1;
    }
    if (indexA < indexB) {
      return -1;
    }
    return 0;
  });
  groupedCommitsByScope.sort((a, b) => {
    const indexA = options.sort?.groups.indexOf(a.id);
    const indexB = options.sort?.groups.indexOf(b.id);

    if (indexA > indexB) {
      return 1;
    }
    if (indexA < indexB) {
      return -1;
    }
    return 0;
  });

  const isGroupByScope = options.commitOptions.groupByScope;
  if (isGroupByScope === true) {
    await pMap(groupedCommitsByScope, updateGroupTitle, {
      concurrency: 1,
    });
  } else {
    await pMap(groupedCommits, updateGroupTitle, {
      concurrency: 1,
    });
  }

  // const git = simpleGit({
  //   baseDir: options.cwd,
  //   binary: 'git',
  //   maxConcurrentProcesses: 6,
  // });

  const updateChangelog = async (scope: string) => {
    let directory = options.cwd;
    let changelogFilename = 'CHANGELOG';
    if (scope === 'root') {
      changelogFilename = 'CHANGELOG_ROOT';
    } else {
      directory = path.join(options.cwd, scope);
    }

    const isEnabled = options.changelogOptions?.[scope]?.enabled;
    if (isEnabled === false) {
      return;
    }

    fs.ensureFile(path.join(directory, `${changelogFilename}.md`));

    const sortedChangelogData = sortChangelogData(
      changelogData,
      options.sort?.packages || []
    );

    const changelogDataForScope = sortedChangelogData[scope];
    if (changelogDataForScope === undefined) {
      return;
    }

    const changelogNewText = changelogDataForScope.reduce(
      (previousValue, currentValue) => {
        const formattedGroupTitle = currentValue.title;
        const formattedCommits = currentValue.commits.join('\n');

        return `${previousValue}\n${formattedGroupTitle}\n${formattedCommits}`;
      },
      ''
    );

    const changelogPath = path.join(directory, `${changelogFilename}.md`);
    const changelogText = fs.readFileSync(changelogPath, 'utf8');

    if (changelogText === '') {
      const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}\n`;
      fs.writeFileSync(changelogPath, newChangelogText);

      // await git.addConfig('user.name', 'semantic-release-bot');
      // await git.addConfig('user.email', 'semantic-release-bot@martynus.net');
      // await git.add(changelogPath);
      return;
    }

    const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}\n\n${changelogText}\n`;
    fs.writeFileSync(changelogPath, newChangelogText);

    // await git.addConfig('user.name', 'semantic-release-bot');
    // await git.addConfig('user.email', 'semantic-release-bot@martynus.net');
    // await git.add(changelogPath);
  };

  const scopes = Array.from(uniqueScopes);
  await pMap(scopes, updateChangelog, {
    concurrency: 1,
  });

  console.log('CHANGELOG DATA: ', JSON.stringify(changelogData, null, 2));

  let newChangelogTextAll = '';
  const rootChangelogPath = path.join(options.cwd, 'CHANGELOG.md');

  const updateChangelogAll = async (scope: string, index: number) => {
    const packageTitle = options.titleOptions?.groups?.[scope] || scope;
    let formattedPackageTitle = await formatGroupTitle(packageTitle);
    formattedPackageTitle = formattedPackageTitle.replace(
      packageTitle,
      `**${packageTitle}**`
    );

    const packageChangelogData = changelogData[scope];

    if (index === 0) {
      newChangelogTextAll += `${releaseNotesTitle}\n\n`;
    }

    newChangelogTextAll += `${formattedPackageTitle}\n\n---\n\n`;

    packageChangelogData.forEach((group) => {
      newChangelogTextAll += `${group.title}\n${group.commits.join('\n')}\n`;
    });

    if (index !== scopes.length - 1) {
      newChangelogTextAll += '\n';
    }
  };

  if (options.includeAll) {
    fs.ensureFile(rootChangelogPath);

    await pMap(scopes, updateChangelogAll, {
      concurrency: 1,
    });

    fs.writeFileSync(rootChangelogPath, newChangelogTextAll);
  }

  // git.commit('docs: Update CHANGELOG.md [skip ci]');

  process.env.HAS_PREVIOUS_SEM_REL_EXECUTION = 'true';

  return releaseNotes;
}
// #endregion

// #region Exports
export { generate };
// #endregion
