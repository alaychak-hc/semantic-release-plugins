// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 06:44:30 PM
  Last Modified: 11-24-2023 06:44:38 PM
  Last Updated By: Andrew Laychak
  
  Description: Interface that contains the information for the project root
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Project Root Info
interface IProjectRootInfo {
  path: string;
  workspaceInfo: IWorkspaceInfo;
}

interface IWorkspaceInfo {
  packages: string[];
}
// #endregion

// #region Exports
export type { IProjectRootInfo, IWorkspaceInfo };
// #endregion
