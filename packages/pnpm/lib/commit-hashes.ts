// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-03-2022 12:18:05 PM
    Last Modified: 11-08-2024 12:44:47 PM
    Last Updated By: Andrew Laychak

    Description: 

    References:
      - None
 ********************************************
*/
// #endregion

// #region Imports
import pMap from 'p-map';
import { simpleGit, SimpleGit } from 'simple-git';
// import { globby } from 'globby';
// import normalize from 'normalize-path';
// import getProjectRoot from './project-root.js';
import { AnalyzeCommitContextWithOptions } from './interfaces/with-options.js';
import { Commit } from 'semantic-release';
// #endregion

// #region Git
const git: SimpleGit = simpleGit();
// #endregion

async function getCommitDetailsByHash(hash: string) {
  const diff = await git.raw([
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    hash,
  ]);

  if (diff) {
    const diffSplit = diff
      .split('\n')
      .filter((f) => f)
      .map((f) => f.trim());

    return diffSplit;
  }

  return [];
}

// #region Get Commit Files By Package
async function getCommitFilesByPackage(
  context: AnalyzeCommitContextWithOptions
): Promise<Set<string>> {
  const { commits } = context;

  // const projectMainRootInfo = await getProjectRoot();
  // const { path: projectMainRoot, workspaceInfo } = projectMainRootInfo;
  // const isRoot = projectMainRoot === cwd;

  // const allPackagesMap = await pMap(workspaceInfo.packages, async (pkgPath) => {
  //   const packagesInPath = await globby(
  //     normalize(`${projectMainRoot}\\${pkgPath}`),
  //     {
  //       onlyDirectories: true,
  //       expandDirectories: false,
  //       globstar: false,
  //     }
  //   );

  //   return packagesInPath;
  // });
  // const allPackages = allPackagesMap.flat();

  // const allPackagesWithoutRoot = allPackages.map((p) =>
  //   p.replace(`${normalize(projectMainRoot)}/`, '')
  // );

  // const isPackage = allPackages.includes(normalize(cwd ?? ''));

  // let packagePath = '';
  // if (!isRoot && isPackage && cwd) {
  //   packagePath = normalize(cwd).replace(`${normalize(projectMainRoot)}/`, '');
  // }

  const finalFiles: Set<string> = new Set();
  const commitIterator = async (commit: Commit): Promise<void> => {
    const { hash } = commit;

    if (commit.author.name === 'semantic-release-bot') {
      return;
    }

    const diff = await git.raw([
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      hash,
    ]);

    if (diff) {
      // console.log('DIFF:', diff);

      const diffSplit = diff
        .split('\n')
        .filter((f) => f)
        .map((f) => f.trim());

      diffSplit.forEach(() => {
        finalFiles.add(hash);
        // if (includeAll) {
        //   finalFiles.add(hash);
        // } else if (isRoot) {
        //   if (!allPackagesWithoutRoot.some((p) => f.startsWith(p))) {
        //     finalFiles.add(hash);
        //   }
        // } else if (f.startsWith(packagePath)) {
        //   finalFiles.add(hash);
        // }
      });
    }
  };

  await pMap(commits, commitIterator, { concurrency: 1 });

  return finalFiles;
}
// #endregion

// #region Exports
export { getCommitDetailsByHash, getCommitFilesByPackage };
// #endregion
