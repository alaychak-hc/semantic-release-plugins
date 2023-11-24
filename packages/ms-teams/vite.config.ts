// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-23-2023 11:08:17 PM
  Last Modified: 11-23-2023 11:08:21 PM
  Last Updated By: Andrew Laychak
  
  Description: Vite configuration file for the MS Teams package.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import { defineConfig } from 'vite';
// #endregion

// #region Config
const config = defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'MyLibrary',
      fileName: (format) => `my-library.${format}.js`,
    },
  },
});
// #endregion

// #region Exports
export default config;
// #endregion
