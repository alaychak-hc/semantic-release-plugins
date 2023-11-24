// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 05:08:32 PM
  Last Modified: 11-24-2023 05:18:20 PM
  Last Updated By: Andrew Laychak
  
  Description: Errors that can be thrown by the JIRA plugin.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Imports
import SemanticReleaseError from '@semantic-release/error';
// #endregion

// #region Regex Error
class RegexError extends SemanticReleaseError {
  constructor(value: string, pattern: RegExp) {
    super(`Value '${value}' does not match regex: ${pattern}`);
  }
}
// #endregion

// #region Invalid Type Error
class InvalidTypeError extends SemanticReleaseError {
  constructor(variableName: string, expectedType: string) {
    super(`${variableName} should be of type: ${expectedType}`);
  }
}
// #endregion

// #region Input Required Error
class InputRequiredError extends SemanticReleaseError {
  constructor(inputName: string) {
    super(`Input '${inputName}' is required`);
  }
}
// #endregion

// #region Exports
export { RegexError, InvalidTypeError, InputRequiredError };
// #endregion
