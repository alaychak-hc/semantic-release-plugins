// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com

  Created At: 11-22-2024 12:58:29 PM
  Last Modified: 11-22-2024 01:02:50 PM
  Last Updated By: Andrew Laychak

  Description: Type definition for the Adaptive Card. Used for sending messages to Microsoft Teams. Uses Handlebars to generate the card.

  References:
    - None
 ********************************************
*/
// #endregion

// #region Adaptive Card - Scope
type Scope = {
  title: string;
  items: {
    title: string;
    commits: string[];
  }[];
};
// #endregion

// #region Adaptive Card - Section
type Section = {
  type: string;
  scopes: Scope[];
};
// #endregion

// #region Adaptive Card
type AdaptiveCard = {
  title: string;
  sections: Section[];
};
// #endregion

// #region Exports
export type { AdaptiveCard };
// #endregion
