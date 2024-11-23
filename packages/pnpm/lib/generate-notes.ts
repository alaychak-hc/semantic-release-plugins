// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-01-2022 09:48:49 AM
    Last Modified: 11-22-2024 10:27:55 PM
    Last Updated By: Andrew Laychak

    Description: 

    References:
      - None
 ********************************************
*/
// #endregion

// #region Imports
import {
  CommitParser,
  Commit as ConventionalCommitCommit,
} from 'conventional-commits-parser';
import { create } from 'express-handlebars';
import handlebars from 'handlebars';
import * as emoji from 'node-emoji';
import pMap from 'p-map';
import path from 'path';
import { Commit } from 'semantic-release';
import slash from 'slash';
import { getCommitDetailsByHash } from './commit-hashes.js';
import { PluginOptions, TitleOptions } from './interfaces/plugin-options.js';
import { GenerateNotesContextWithOptions } from './interfaces/with-options.js';
import { mergeOptions } from './merged-options.js';
import { getDirectory } from './utilities/folder-path.js';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
// #endregion

const commitParser = new CommitParser();

type GroupCommitDetails = {
  commit: Commit;
  ccCommit: ConventionalCommitCommit;
  files: string[];
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

type ReleaseCommitDetails = {
  commit: Commit;
  ccCommit: ConventionalCommitCommit;
  impactedPackages: string[];
};

type ReleaseCommitGroup = {
  [key: string]: ReleaseCommitDetails[];
};

type ReleaseCommit = {
  [key: string]: ReleaseCommitGroup;
};

type ReleaseCommits = {
  [key: string]: ReleaseCommit;
};

const groupedCommitsByScope: GroupByScope[] = [];

type ChangeLogData = {
  type: string;
  scope: string;
  impactedPackagesTitle: string;
  commit: ReleaseCommitDetails;
};

type ChangeLog = {
  id: string;
  data: {
    [type: string]: {
      [scope: string]: ChangeLogData[];
    };
  };
};

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
  context: GenerateNotesContextWithOptions,
  pluginConfig: PluginOptions
) {
  const { jiraOptions } = pluginConfig;
  let repositoryUrl = context?.options?.repositoryUrl;
  if (repositoryUrl !== undefined) {
    repositoryUrl = repositoryUrl
      .replace('.git', '')
      .replace('git@github.com:', 'https://github.com/');
  }

  const titleTemplatePath = slash(
    path.join(getDirectory(import.meta.url), 'templates/commit.hbs')
  );

  let newSubject = commit.ccCommit.subject?.replace('[skip ci]', '').trim();
  if (jiraOptions) {
    const { host, ticketPrefixes } = jiraOptions;
    const issueRegex = new RegExp(
      `(\\[)?(${ticketPrefixes.join('|')}-[1-9][0-9]*)(\\])?`,
      'g'
    );

    newSubject = newSubject?.replace(
      issueRegex,
      (_match, bracketStart, issue, bracketEnd) => {
        const markdownLink = `[${issue}](${host}/browse/${issue})`;
        return bracketStart && bracketEnd ? `[${markdownLink}]` : markdownLink;
      }
    );
  }

  let renderedTemplate = await viewInstance.render(titleTemplatePath, {
    subject: newSubject,
    commit,
    repositoryUrl,
  });

  if (repositoryUrl) {
    renderedTemplate = convertPullRequestOrIssueToLink(
      repositoryUrl,
      renderedTemplate
    );
  }

  return emoji.emojify(renderedTemplate);
}

async function parseCommit(commit: Commit, options: PluginOptions) {
  const commitDetails = commitParser.parse(commit.subject);

  const commitFiles = await getCommitDetailsByHash(commit.hash);

  const findGroup = groupedCommitsByScope.find(
    (group) => group.scope === commitDetails.scope
  );

  if (findGroup) {
    findGroup.commits.push({
      commit,
      ccCommit: commitDetails,
      files: commitFiles,
    });
  } else {
    if (commitDetails.scope) {
      let newScopeTitle =
        options.titleOptions?.scopes?.[commitDetails.scope] ||
        commitDetails.scope;

      groupedCommitsByScope.push({
        id: commitDetails.scope,
        title: newScopeTitle,
        scope: commitDetails.scope,
        commits: [
          {
            commit,
            ccCommit: commitDetails,
            files: commitFiles,
          },
        ],
      });
    }
  }
}

function getImpactedPackages(
  files: string[],
  options: PluginOptions
): string[] {
  const impactedPackageIds = new Set<string>();

  const packagesWithLocation = options.packages.filter((pkg) => pkg.location);

  for (const file of files) {
    let matched = false;
    for (const pkg of packagesWithLocation) {
      if (file.startsWith(pkg.location + '/')) {
        impactedPackageIds.add(pkg.id);
        matched = true;
        break;
      }
    }

    if (!matched) {
      impactedPackageIds.add('root');
    }
  }

  return Array.from(impactedPackageIds);
}

function sortPackages(packageIds: string[], options: PluginOptions): string[] {
  if (!options.sort || !options.sort.packages) {
    return packageIds;
  }

  const sortOrder = options.sort.packages;
  return packageIds
    .sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b))
    .map((id) => {
      const pkg = options.packages.find((p) => p.id === id);
      return pkg ? pkg.title : id;
    });
}

function groupByImpactedPackages(data: ChangeLog[]) {
  return data.map(({ id, data }) => {
    const groupedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        Object.fromEntries(
          Object.entries(value).map(([subKey, subValue]) => [
            subKey,
            Object.groupBy(subValue, (entry) => entry.impactedPackagesTitle),
          ])
        ),
      ])
    );
    return { id, data: groupedData };
  });
}

// #region Generate
async function generate(
  pluginConfig: PluginOptions,
  context: GenerateNotesContextWithOptions
): Promise<string> {
  const { logger, options: contextOptions } = context;
  const isDryRunMode = contextOptions.dryRun === true;

  const newContext = context;

  const options = mergeOptions(pluginConfig);
  const {} = options;

  newContext.commits = newContext.commits.filter(
    (f) => f.author.name !== 'semantic-release-bot'
  );

  const releaseNotesTitle = await getTitle(options.titleOptions, newContext);
  let releaseNotes = releaseNotesTitle;

  const getCommitData = async (commit: Commit) => {
    await parseCommit(commit, options);
  };

  await pMap(context.commits, getCommitData, {
    concurrency: 1,
  });

  const changelogs: ChangeLog[] = [
    {
      id: 'full',
      data: {},
    },
  ];
  const releaseCommits: ReleaseCommits = {};
  const updateGroupTitle = async (group: Group | GroupByScope) => {
    const formattedGroupTitle = await formatGroupTitle(group.title);
    releaseNotes += `\n\n${formattedGroupTitle}`;

    for (const commit of group.commits) {
      let impactedPackageIds = getImpactedPackages(commit.files, options);

      const commitType = commit.ccCommit.type as string;
      const commitScope = commit.ccCommit.scope as string;

      const isIgnoredType = options.ignore?.types?.includes(commitType);
      const isIgnoredScope = options.ignore?.scopes?.includes(commitScope);

      const ignoredScopes = options.ignore?.scopes?.filter((scope) =>
        impactedPackageIds.includes(scope)
      );

      impactedPackageIds = impactedPackageIds.filter(
        (id) => !ignoredScopes?.includes(id)
      );

      impactedPackageIds = impactedPackageIds.filter(
        (id) => !options.ignore?.packages?.includes(id)
      );

      const sortedImpactedPackages = sortPackages(impactedPackageIds, options);
      const commitTitle = sortedImpactedPackages.join(' | ');

      if (!isIgnoredType) {
        if (releaseCommits[commitType] === undefined) {
          releaseCommits[commitType] = {};
        }

        if (!isIgnoredScope) {
          const fullChangelog = changelogs.find((c) => c.id === 'full')!;
          if (fullChangelog.data[commitType] === undefined) {
            fullChangelog.data[commitType] = {};
          }

          if (fullChangelog.data[commitType][commitScope] === undefined) {
            fullChangelog.data[commitType][commitScope] = [];
          }

          fullChangelog.data[commitType][commitScope].push({
            type: commitType,
            scope: commitScope,
            impactedPackagesTitle: commitTitle,
            commit: {
              commit: commit.commit,
              ccCommit: commit.ccCommit,
              impactedPackages: impactedPackageIds,
            },
          });

          impactedPackageIds.forEach((id) => {
            const changelog = changelogs.find((c) => c.id === id);

            if (changelog) {
              if (changelog.data[commitType] === undefined) {
                changelog.data[commitType] = {};
              }

              if (changelog.data[commitType][commitScope] === undefined) {
                changelog.data[commitType][commitScope] = [];
              }

              changelog.data[commitType][commitScope].push({
                type: commitType,
                scope: commitScope,
                impactedPackagesTitle: commitTitle,
                commit: {
                  commit: commit.commit,
                  ccCommit: commit.ccCommit,
                  impactedPackages: impactedPackageIds,
                },
              });
            } else {
              changelogs.push({
                id,
                data: {
                  [commitType]: {
                    [commitScope]: [
                      {
                        type: commitType,
                        scope: commitScope,
                        impactedPackagesTitle: commitTitle,
                        commit: {
                          commit: commit.commit,
                          ccCommit: commit.ccCommit,
                          impactedPackages: impactedPackageIds,
                        },
                      },
                    ],
                  },
                },
              });
            }
          });

          if (releaseCommits[commitType][commitScope] === undefined) {
            releaseCommits[commitType][commitScope] = {};
          }

          if (
            releaseCommits[commitType][commitScope][commitTitle] === undefined
          ) {
            releaseCommits[commitType][commitScope][commitTitle] = [];
          }

          releaseCommits[commitType][commitScope][commitTitle].push({
            commit: commit.commit,
            ccCommit: commit.ccCommit,
            impactedPackages: impactedPackageIds,
          });

          const sortedKeys = Object.keys(
            releaseCommits[commitType][commitScope]
          ).sort();
          const sortedObject: Record<string, ReleaseCommitDetails[]> = {};

          for (const key of sortedKeys) {
            sortedObject[key] = releaseCommits[commitType][commitScope][key];
          }

          releaseCommits[commitType][commitScope] = sortedObject;
        }
      }
    }
  };

  groupedCommitsByScope.sort((a, b) => {
    const indexA = options.sort?.types ? options.sort?.types.indexOf(a.id) : 0;
    const indexB = options.sort?.types ? options.sort?.types.indexOf(b.id) : 0;

    if (indexA > indexB) {
      return 1;
    }
    if (indexA < indexB) {
      return -1;
    }
    return 0;
  });

  await pMap(groupedCommitsByScope, updateGroupTitle, {
    concurrency: 1,
  });

  const git = simpleGit({
    baseDir: options.cwd,
    binary: 'git',
    maxConcurrentProcesses: 6,
  });

  const groupedChangelogCommitsByTitle = groupByImpactedPackages(changelogs);

  console.log(JSON.stringify(groupedChangelogCommitsByTitle, null, 2));
  for (const changelog of groupedChangelogCommitsByTitle) {
    let file = 'CHANGELOG.md';
    if (changelog.id === 'root') {
      file = 'CHANGELOG_ROOT.md';
    }

    let fileLocation = '';
    if (changelog.id !== 'full' && changelog.id !== 'root') {
      const packageFolder = options.packages.find(
        (pkg) => pkg.id === changelog.id
      );

      if (!packageFolder) {
        throw new Error(
          `Could not find package folder for package id: ${changelog.id}`
        );
      }
      fileLocation = path.join(options.cwd, packageFolder.location ?? '');
    }

    let changelogNewText = '';
    const { data } = changelog;

    const keys = Object.keys(data);
    for (const [index, type] of keys.entries()) {
      const typeData = data[type];
      const typeTitle = options.titleOptions?.types?.[type] ?? type;
      changelogNewText += `## ${typeTitle}\n`;

      const scopeKeys = Object.keys(typeData);
      for (const [scopeIndex, scope] of scopeKeys.entries()) {
        const scopeData = typeData[scope];
        const scopeTitle = options.titleOptions?.scopes?.[scope] ?? scope;
        changelogNewText += `### ${scopeTitle}`;

        if (scopeIndex !== scopeKeys.length - 1) {
          changelogNewText += '\n';
        }

        if (scopeIndex === scopeKeys.length - 1) {
          changelogNewText += '\n';
        }

        const impactedPackagesTitleKeys = Object.keys(scopeData);
        for (const [
          _impactedPackagesTitleIndex,
          impactedPackagesTitle,
        ] of impactedPackagesTitleKeys.entries()) {
          const impactedPackagesData = scopeData[impactedPackagesTitle];

          if (changelog.id === 'full') {
            changelogNewText += `#### ${impactedPackagesTitle}\n`;
          }

          if (impactedPackagesData) {
            for (const data of impactedPackagesData) {
              const commitText = await getCommit(
                {
                  commit: data.commit.commit,
                  ccCommit: data.commit.ccCommit,
                  files: [],
                },
                newContext,
                pluginConfig
              );

              changelogNewText += `${commitText}\n`;
            }
          }
        }
      }

      if (index !== keys.length - 1) {
        changelogNewText += '\n';
      }
    }

    const changelogPath = path.join(fileLocation, file);
    const changelogText =
      fs.existsSync(changelogPath) === false
        ? ''
        : fs.readFileSync(changelogPath, 'utf8');

    if (changelogText === '') {
      const newChangelogText = `${releaseNotesTitle}\n\n${changelogNewText}`;

      if (changelog.id === 'full') {
        releaseNotes = newChangelogText;
      }

      await fs.writeFile(changelogPath, newChangelogText);

      if (!isDryRunMode) {
        await git.add(changelogPath);
      } else {
        logger.log(`Skippping git add for ${changelogPath}`);
      }
    } else {
      if (changelog.id === 'full') {
        releaseNotes = `${releaseNotesTitle}\n\n${changelogNewText}`;
      }

      const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}\n${changelogText}`;
      await fs.writeFile(changelogPath, newChangelogText);

      if (!isDryRunMode) {
        await git.add(changelogPath);
      } else {
        logger.log(`Skippping git add for ${changelogPath}`);
      }
    }
  }

  if (!isDryRunMode) {
    git
      .commit('docs(release): Updated changelogs [skip ci]', {
        '--author':
          '"semantic-release-bot <semantic-release-bot@martynus.net>"',
      })
      .then(() => {
        git.push();
      });
  } else {
    logger.log(`Skippping git commit and push for changelogs`);
  }

  process.env.HAS_PREVIOUS_SEM_REL_EXECUTION = 'true';

  return releaseNotes;
}
// #endregion

// #region Exports
export { generate };
// #endregion
