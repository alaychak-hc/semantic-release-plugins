// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-28-2023 12:21:39 AM
  Last Modified: 11-08-2024 12:19:24 PM
  Last Updated By: Andrew Laychak
  
  Description: Merges the user options with the default options.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { PluginOptions } from './interfaces/plugin-options.js';
import merge from 'deepmerge';
import { format } from 'date-fns';
// #endregion

// #region Default Options
const defaultOptions: PluginOptions = {
  titleOptions: {
    name: 'Release Notes',
    includeCompareLink: true,
    date: 'yyyy-MM-dd',
  },
  packages: [
    {
      id: 'root',
      title: 'Root',
    },
  ],
  sort: {
    scopes: ['fixes', 'refactor', 'documentation', 'build', 'chores'],
    types: ['fix', 'refactor', 'docs', 'build', 'chore'],
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
