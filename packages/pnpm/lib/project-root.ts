// #region Developer Information
/*
 ********************************************
    Author: Andrew Laychak
    Email: ALaychak@harriscomputer.com

    Created At: 08-04-2022 11:13:56 AM
    Last Modified: 11-24-2023 06:44:41 PM
    Last Updated By: Andrew Laychak

    Description: Retrieves the project root

    References:
      - None
 ********************************************
*/
// #endregion

// #region Imports
import { findUp } from 'find-up';
import fs from 'fs';
import { parse as yamlParse } from 'yaml';
import {
  IProjectRootInfo,
  IWorkspaceInfo,
} from './interfaces/project-root-info.js';
// #endregion

// #region Get Project Root
async function getProjectRootInfo(): Promise<IProjectRootInfo> {
  const pnpmWorkspaceFileName = 'pnpm-workspace.yaml';
  const pnpmWorkspacePath = await findUp(pnpmWorkspaceFileName);

  if (!pnpmWorkspacePath) {
    throw new Error("Couldn't find pnpm workspace file");
  }

  const projectMainRoot = pnpmWorkspacePath
    .replace(`/${pnpmWorkspaceFileName}`, '')
    .replace(`\\${pnpmWorkspaceFileName}`, '');

  const workspaceFile = fs.readFileSync(pnpmWorkspacePath, 'utf8');
  const workspaceInfo = yamlParse(workspaceFile) as IWorkspaceInfo;

  return {
    path: projectMainRoot,
    workspaceInfo,
  };
}
// #endregion

// #region Exports
export default getProjectRootInfo;
// #endregion
