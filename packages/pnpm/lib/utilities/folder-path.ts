// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-26-2023 04:37:40 PM
  Last Modified: 11-26-2023 04:37:48 PM
  Last Updated By: Andrew Laychak
  
  Description: Gets the directory of the current file.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import * as url from 'url';
// #endregion

// #region File Name / Directory Name
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function getDirectory(importMetaUrl: string): string {
  return url.fileURLToPath(new URL('.', importMetaUrl));
}
// #endregion

// #region Exports
export { __filename, __dirname, getDirectory };
// #endregion
