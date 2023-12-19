// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-01-2022 09:48:49 AM
    Last Modified: 12-19-2023 12:43:20 AM
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
import pMap from 'p-map';
import * as emoji from 'node-emoji';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
import { mergeOptions } from './merged-options.js';
import { sendMessage } from './send-message.js';
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

const viewInstance = create({
  layoutsDir: `${getDirectory(import.meta.url)}/templates`,
  extname: '.hbs',
  handlebars: handlebars.create(),
  helpers: {
    removeSkipCi: (text: string) => {
      return text.replace('[skip ci]', '').trim();
    },
  },
});

// #region Title
async function getTitle(
  titleOptions: TitleOptions,
  context: GenerateNotesContextWithOptions
) {
  const { lastRelease, nextRelease } = context;
  const { version } = nextRelease;

  const previousTag = lastRelease.gitTag || lastRelease.gitHead;
  const currentTag = nextRelease.gitTag || nextRelease.gitHead;

  let repositoryUrl = context?.options?.repositoryUrl;
  if (repositoryUrl !== undefined) {
    repositoryUrl = repositoryUrl
      .replace('.git', '')
      .replace('git@github.com:', 'https://github.com/');
  }
  const compareLink = `${repositoryUrl}/compare/${previousTag}...${currentTag}`;

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

function convertPullRequestOrIssueToLink(repositoryUrl: string, text: string) {
  const PULL_REQUEST_OR_ISSUE_REGEX = /\(#(\d+)\)/g;

  const newText = text?.replace(
    PULL_REQUEST_OR_ISSUE_REGEX,
    (_match, issue) => {
      const markdownLink = `[#${issue}](${repositoryUrl}/issues/${issue})`;
      return `(${markdownLink})`;
    }
  );

  return newText;
}

async function getCommit(
  commit: GroupCommitDetails,
  jiraOptions?: JiraOptions,
  context?: GenerateNotesContextWithOptions
  // _commitOptions: CommitOptions,
) {
  let repositoryUrl = context?.options?.repositoryUrl;
  if (repositoryUrl !== undefined) {
    repositoryUrl = repositoryUrl
      .replace('.git', '')
      .replace('git@github.com:', 'https://github.com/');
  }

  const titleTemplatePath = slash(
    path.join(getDirectory(import.meta.url), 'templates/commit.hbs')
  );

  let renderedTemplate = await viewInstance.render(titleTemplatePath, {
    commit,
    repositoryUrl,
  });

  if (jiraOptions) {
    renderedTemplate = convertJiraIssuesToLink(jiraOptions, renderedTemplate);
  }

  if (repositoryUrl) {
    renderedTemplate = convertPullRequestOrIssueToLink(
      repositoryUrl,
      renderedTemplate
    );
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
  const { logger, options: contextOptions } = context;
  const isDryRunMode = contextOptions.dryRun === true;

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
      const commitText = await getCommit(
        commit,
        pluginConfig.jiraOptions,
        context
      );

      releaseNotes += `\n${commitText}`;

      if (commit.ccCommit.scope) {
        uniqueScopes.add(commit.ccCommit.scope);

        if (!changelogData[commit.ccCommit.scope]) {
          changelogData[commit.ccCommit.scope] = [
            {
              title: formattedGroupTitle,
              commits: [commitText],
            },
          ];
        } else {
          const changelogCommitData = changelogData[commit.ccCommit.scope].find(
            (group) => group.title === formattedGroupTitle
          );

          if (changelogCommitData === undefined) {
            changelogData[commit.ccCommit.scope] = [
              ...changelogData[commit.ccCommit.scope],
              {
                title: formattedGroupTitle,
                commits: [commitText],
              },
            ];
          } else {
            changelogCommitData.commits.push(commitText);
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

  const git = simpleGit({
    baseDir: options.cwd,
    binary: 'git',
    maxConcurrentProcesses: 6,
  });

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

        return `${previousValue}\n${formattedGroupTitle}\n\n${formattedCommits}\n`;
      },
      ''
    );

    const changelogPath = path.join(directory, `${changelogFilename}.md`);
    const changelogText =
      fs.existsSync(changelogPath) === false
        ? ''
        : fs.readFileSync(changelogPath, 'utf8');

    if (changelogText === '') {
      const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}`;
      await fs.writeFile(changelogPath, newChangelogText);

      if (!isDryRunMode) {
        await git.add(changelogPath);
      } else {
        logger.log(`Skippping git add for ${changelogPath}`);
      }
      return;
    }

    const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}\n${changelogText}`;
    await fs.writeFile(changelogPath, newChangelogText);

    if (!isDryRunMode) {
      await git.add(changelogPath);
    } else {
      logger.log(`Skippping git add for ${changelogPath}`);
    }
  };

  const scopes = Array.from(uniqueScopes);
  await pMap(scopes, updateChangelog, {
    concurrency: 1,
  });

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

    newChangelogTextAll += `${formattedPackageTitle}\n\n`;

    packageChangelogData.forEach((group, index) => {
      newChangelogTextAll += `${group.title}\n\n${group.commits.join('\n')}`;

      if (index !== packageChangelogData.length - 1) {
        newChangelogTextAll += '\n\n';
      } else if (index === packageChangelogData.length - 1) {
        newChangelogTextAll += '\n';
      }
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

    const rootChangelogText =
      fs.existsSync(rootChangelogPath) === false
        ? ''
        : fs.readFileSync(rootChangelogPath, 'utf8');

    if (rootChangelogText === '') {
      await fs.writeFile(rootChangelogPath, newChangelogTextAll);
    } else {
      const newChangelogTextAll2 = `${newChangelogTextAll}\n${rootChangelogText}`;
      await fs.writeFile(rootChangelogPath, newChangelogTextAll2);
    }

    if (!isDryRunMode) {
      await git.add(rootChangelogPath);
    } else {
      logger.log(`Skippping git add for ${rootChangelogPath}`);
    }
  }

  if (!isDryRunMode) {
    git
      .commit('docs: Update CHANGELOG.md [skip ci]', {
        '--author':
          '"semantic-release-bot <semantic-release-bot@martynus.net>"',
      })
      .then(() => {
        git.push();
      });
  } else {
    logger.log(`Skippping git commit and push for CHANGELOG.md`);
  }

  process.env.HAS_PREVIOUS_SEM_REL_EXECUTION = 'true';

  if (isDryRunMode) {
    logger.log(
      `Will publish actual release notes in MS Teams after 'prepare' event`
    );

    const notifyInDryRun = options.msTeamsOptions?.notifyInDryRun === true;

    if (notifyInDryRun) {
      await sendMessage(pluginConfig, context, releaseNotes);
    }
  }

  return releaseNotes;
}
// #endregion

// #region Exports
export { generate };
// #endregion
