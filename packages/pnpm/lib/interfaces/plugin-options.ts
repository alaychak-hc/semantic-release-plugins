// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:41:25 PM
  Last Modified: 11-28-2023 12:15:39 AM
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
  groups?: {
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

// #region Jira Options
type JiraOptions = {
  host: string;
  ticketPrefixes: string[];
};
// #endregion

type ChangelogOptions = {
  [key: string]: {
    enabled?: boolean;
  };
};

type MsTeamsOptions = {
  webhookUrl: string;
  webhookUrlDryRun?: string;
  title?: string;
  imageUrl?: string;
  showContributors?: boolean;
  notifyInDryRun?: boolean;
};

// #region Plugin Options
type PluginOptions = {
  cwd?: string;
  includeAll?: boolean;
  titleOptions?: TitleOptions;
  commitOptions?: CommitOptions;
  jiraOptions?: JiraOptions;
  changelogOptions?: ChangelogOptions;
  sort?: {
    packages?: string[];
    groups?: string[];
    commits?: string[];
  };
  msTeamsOptions?: MsTeamsOptions;
};
// #endregion

// #region Exports
export type {
  TitleOptions,
  CommitOptions,
  GroupOptions,
  JiraOptions,
  PluginOptions,
};
// #endregion
