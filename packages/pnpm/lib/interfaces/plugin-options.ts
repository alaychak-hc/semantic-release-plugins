// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:41:25 PM
  Last Modified: 11-20-2024 04:14:48 PM
  Last Updated By: Andrew Laychak
  
  Description: Type for the plugin options.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Title Options
type TitleOptions = {
  name: string;
  includeCompareLink: boolean;
  date: string;
  types?: {
    [key: string]: string;
  };
  scopes?: {
    [key: string]: string;
  };
};
// #endregion

// #region Group Options
type GroupOptions = {
  id: string;
  type: string | string[];
  scope?: string | string[];
  section: string;
};
// #endregion

// #region Commit Options
type CommitOptions = {
  groupByScope: boolean;
  groups: GroupOptions[];
};
// #endregion

type Package = {
  id: string;
  title: string;
  location?: string;
};

type Ignore = {
  packages?: string[];
  scopes?: string[];
  types?: string[];
};

type SortOptions = {
  packages?: string[];
  scopes?: string[];
  types?: string[];
};

// #region Plugin Options
type PluginOptions = {
  cwd?: string;
  packages: Package[];
  sort?: SortOptions;
  ignore?: Ignore;

  titleOptions?: TitleOptions;
  commandOptions?: {
    [key: string]: string[];
  };
};
// #endregion

// #region Exports
export type {
  TitleOptions,
  CommitOptions,
  GroupOptions,
  PluginOptions,
  SortOptions,
};
// #endregion
