// #region Developer Information
/*
 ********************************************
  Author: Andrew Laychak
  Email: ALaychak@HarrisComputer.com
  
  Created At: 11-24-2023 12:56:00 AM
  Last Modified: 11-28-2023 12:16:17 AM
  Last Updated By: Andrew Laychak
  
  Description: Interface for the Microsoft Teams Connector Card.
  
  References:
    - None
 ********************************************
*/
// #endregion

// #region Microsoft Teams Connector Card
interface MicrosoftTeamsConnectorCard {
  '@type': string;
  '@context': string;
  summary: string;
  title?: string;
  themeColor: string;
  sections: Section[];
  potentialAction?: PotentialAction[];
}
// #endregion

// #region Potential Action
interface PotentialAction {
  '@context': string;
  '@type': string;
  name: string;
  target: string[];
}
// #endregion

// #region Section
interface Section {
  activityTitle?: string;
  activitySubtitle?: string;
  activityText?: string;
  activityImage?: string;
  title?: string;
  facts?: Fact[];
  images?: Image[];
  markdown?: boolean;
  text?: string;
}
// #endregion

// #region Fact
interface Fact {
  name: string;
  value: string | number;
}
// #endregion

// #region Image
interface Image {
  image: string;
}
// #endregion

// #region Exports
export type { MicrosoftTeamsConnectorCard, Fact };
// #endregion
