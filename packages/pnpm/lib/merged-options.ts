// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-28-2023 12:21:39 AM
  Last Modified: 11-28-2023 12:24:55 AM
  Last Updated By: Andrew Laychak
  
  Description: Merges the user options with the default options.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { PluginOptions } from './interfaces/plugin-options';
import merge from 'deepmerge';
import { format } from 'date-fns';
// #endregion

// #region Default Options
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
  msTeamsOptions: {
    webhookUrl: '',
    notifyInDryRun: true,
  },
};
// #endregion

// #region Merge Options
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
// #endregion

// #region Exports
export { mergeOptions };
// #endregion
