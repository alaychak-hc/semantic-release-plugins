// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-01-2022 09:48:49 AM
    Last Modified: 11-21-2024 12:45:12 PM
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
import {
  PluginOptions,
  TitleOptions,
  // type SortOptions,
} from './interfaces/plugin-options.js';
import { GenerateNotesContextWithOptions } from './interfaces/with-options.js';
import { mergeOptions } from './merged-options.js';
import { getDirectory } from './utilities/folder-path.js';
import fs from 'fs-extra';
import { simpleGit } from 'simple-git';
// #endregion

const commitParser = new CommitParser();

// type NestedObject = Record<string, any>;

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

/**
 * Sorts an object based on the provided order arrays.
 * @param {Object} data - The data object to sort.
 * @param {Array} typeOrder - The desired order for top-level keys.
 * @param {Array} scopeOrder - The desired order for sub-keys.
 * @returns {Object} - The sorted object.
 */
// function sortData(data: ReleaseCommits, sortConfig: SortOptions) {
//   const { types, scopes } = sortConfig;

//   const sortKeys = (keys: string[], order: string[]) => {
//     return keys.sort((a, b) => {
//       const indexA = order.indexOf(a);
//       const indexB = order.indexOf(b);
//       if (indexA === -1 && indexB === -1) {
//         return a.localeCompare(b);
//       }
//       if (indexA === -1) return 1;
//       if (indexB === -1) return -1;
//       return indexA - indexB;
//     });
//   };

//   const sortedTypes = sortKeys(Object.keys(data), types ?? []);

//   const sortedData: ReleaseCommits = {};

//   sortedTypes.forEach((type) => {
//     const typeData = data[type];
//     if (typeData) {
//       const sortedScopes = sortKeys(Object.keys(typeData), scopes ?? []);
//       sortedData[type] = {};
//       sortedScopes.forEach((scope) => {
//         sortedData[type][scope] = typeData[scope];
//       });
//     }
//   });

//   return sortedData;
// }

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

// function removeEmptyObjects(obj: NestedObject): NestedObject {
//   const result: NestedObject = {};

//   for (const key in obj) {
//     const value = obj[key];

//     if (typeof value === 'object' && value !== null) {
//       const cleanedObject = removeEmptyObjects(value as NestedObject);
//       if (Object.keys(cleanedObject).length > 0) {
//         result[key] = cleanedObject;
//       }
//     } else {
//       result[key] = value;
//     }
//   }

//   return result;
// }

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

      // titles.add(commitTitle);

      // const commitText = await getCommit(commit, context);

      // releaseNotes += `\n${commitText}`;

      // if (commit.ccCommit.scope) {
      //   uniqueScopes.add(commit.ccCommit.scope);

      //   if (!changelogData[commit.ccCommit.scope]) {
      //     changelogData[commit.ccCommit.scope] = [
      //       {
      //         title: formattedGroupTitle,
      //         commits: [commitText],
      //       },
      //     ];
      //   } else {
      //     const changelogCommitData = changelogData[commit.ccCommit.scope].find(
      //       (group) => group.title === formattedGroupTitle
      //     );

      //     if (changelogCommitData === undefined) {
      //       changelogData[commit.ccCommit.scope] = [
      //         ...changelogData[commit.ccCommit.scope],
      //         {
      //           title: formattedGroupTitle,
      //           commits: [commitText],
      //         },
      //       ];
      //     } else {
      //       changelogCommitData.commits.push(commitText);
      //     }
      //   }
      // }
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
                newContext
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
      const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}\n${changelogText}`;
      await fs.writeFile(changelogPath, newChangelogText);

      if (!isDryRunMode) {
        await git.add(changelogPath);
      } else {
        logger.log(`Skippping git add for ${changelogPath}`);
      }
    }
  }

  // const sortedReleaseCommits = sortData(releaseCommits, options.sort);
  // const removedEmptyObjects = removeEmptyObjects(sortedReleaseCommits);
  // console.log(JSON.stringify(sortedReleaseCommits, null, 2));
  // console.dir(sortedReleaseCommits);

  // for (const type in removedEmptyObjects) {
  //   const typeData = removedEmptyObjects[type];

  //   for (const scope in typeData) {
  //     const scopeData = typeData[scope];

  //     for (const title in scopeData) {
  //       const titleData = scopeData[title];
  //       for (const commit of titleData) {
  //         console.dir(commit);
  //       }
  //     }
  //   }
  // }

  // const updateChangelog = async (scope: string) => {
  //   let directory = options.cwd;
  //   let changelogFilename = 'CHANGELOG';
  //   if (scope === 'root') {
  //     changelogFilename = 'CHANGELOG_ROOT';
  //   } else {
  //     directory = path.join(options.cwd, scope);
  //   }

  //   const isScopeIgnored = options.ignore?.scopes?.includes(scope);
  //   if (isScopeIgnored) {
  //     return;
  //   }

  //   fs.ensureFile(path.join(directory, `${changelogFilename}.md`));

  //   const sortedChangelogData = sortChangelogData(
  //     changelogData,
  //     options.sort?.packages || []
  //   );

  //   const changelogDataForScope = sortedChangelogData[scope];
  //   if (changelogDataForScope === undefined) {
  //     return;
  //   }

  //   const changelogNewText = changelogDataForScope.reduce(
  //     (previousValue, currentValue) => {
  //       const formattedGroupTitle = currentValue.title;
  //       const formattedCommits = currentValue.commits.join('\n');

  //       return `${previousValue}\n${formattedGroupTitle}\n\n${formattedCommits}\n`;
  //     },
  //     ''
  //   );

  //   const changelogPath = path.join(directory, `${changelogFilename}.md`);
  //   const changelogText =
  //     fs.existsSync(changelogPath) === false
  //       ? ''
  //       : fs.readFileSync(changelogPath, 'utf8');

  //   if (changelogText === '') {
  //     const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}`;
  //     await fs.writeFile(changelogPath, newChangelogText);

  //     if (!isDryRunMode) {
  //       await git.add(changelogPath);
  //     } else {
  //       logger.log(`Skippping git add for ${changelogPath}`);
  //     }
  //     return;
  //   }

  //   // const newChangelogText = `${releaseNotesTitle}\n${changelogNewText}\n${changelogText}`;
  //   // await fs.writeFile(changelogPath, newChangelogText);

  //   // if (!isDryRunMode) {
  //   //   await git.add(changelogPath);
  //   // } else {
  //   //   logger.log(`Skippping git add for ${changelogPath}`);
  //   // }
  // };

  // const scopes = Array.from(uniqueScopes);
  // await pMap(scopes, updateChangelog, {
  //   concurrency: 1,
  // });

  // let newChangelogTextAll = '';
  // const rootChangelogPath = path.join(options.cwd, 'CHANGELOG.md');

  // const updateChangelogAll = async (scope: string, index: number) => {
  //   const packageTitle = options.titleOptions?.groups?.[scope] || scope;
  //   let formattedPackageTitle = await formatGroupTitle(packageTitle);
  //   formattedPackageTitle = formattedPackageTitle.replace(
  //     packageTitle,
  //     `**${packageTitle}**`
  //   );

  //   const packageChangelogData = changelogData[scope];

  //   if (index === 0) {
  //     newChangelogTextAll += `${releaseNotesTitle}\n\n`;
  //   }

  //   newChangelogTextAll += `${formattedPackageTitle}\n\n`;

  //   packageChangelogData.forEach((group, index) => {
  //     newChangelogTextAll += `${group.title}\n\n${group.commits.join('\n')}`;

  //     if (index !== packageChangelogData.length - 1) {
  //       newChangelogTextAll += '\n\n';
  //     } else if (index === packageChangelogData.length - 1) {
  //       newChangelogTextAll += '\n';
  //     }
  //   });

  //   if (index !== scopes.length - 1) {
  //     newChangelogTextAll += '\n';
  //   }
  // };

  // fs.ensureFile(rootChangelogPath);

  // await pMap(scopes, updateChangelogAll, {
  //   concurrency: 1,
  // });

  // const rootChangelogText =
  //   fs.existsSync(rootChangelogPath) === false
  //     ? ''
  //     : fs.readFileSync(rootChangelogPath, 'utf8');

  // if (rootChangelogText === '') {
  //   await fs.writeFile(rootChangelogPath, newChangelogTextAll);
  // } else {
  //   const newChangelogTextAll2 = `${newChangelogTextAll}\n${rootChangelogText}`;
  //   await fs.writeFile(rootChangelogPath, newChangelogTextAll2);
  // }

  // if (!isDryRunMode) {
  //   await git.add(rootChangelogPath);
  // } else {
  //   logger.log(`Skippping git add for ${rootChangelogPath}`);
  // }

  // if (!isDryRunMode) {
  //   git
  //     .commit('docs: Update CHANGELOG.md [skip ci]', {
  //       '--author':
  //         '"semantic-release-bot <semantic-release-bot@martynus.net>"',
  //     })
  //     .then(() => {
  //       git.push();
  //     });
  // } else {
  //   logger.log(`Skippping git commit and push for CHANGELOG.md`);
  // }

  process.env.HAS_PREVIOUS_SEM_REL_EXECUTION = 'true';

  return releaseNotes;
}
// #endregion

// #region Exports
export { generate };
// #endregion
