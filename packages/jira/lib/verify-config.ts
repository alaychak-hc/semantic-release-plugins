// #region Imports
import { VerifyConditionsContext } from 'semantic-release';
import { PluginOptions } from './interfaces/plugin-options.js';
import { InputRequiredError, RegexError } from './errors.js';
import SemanticReleaseError from '@semantic-release/error';
import AggregateError from 'aggregate-error';
// #endregion

const TICKET_PREFIX_REGEX = /^[A-Z][A-Z0-9]{0,50}$/;
const DOMAIN_NAME_REGEX = /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}$/;

// #region Verify Configurations
function verifyConfiguration(
  pluginConfig: PluginOptions,
  _context: VerifyConditionsContext
) {
  const { jiraHost, ticketPrefixes } = pluginConfig;

  const errors = [];

  if (ticketPrefixes && !Array.isArray(ticketPrefixes)) {
    errors.push(new SemanticReleaseError(ticketPrefixes, Array.name));
  } else if (ticketPrefixes) {
    for (const prefix of ticketPrefixes) {
      if (!TICKET_PREFIX_REGEX.test(prefix)) {
        errors.push(new RegexError(prefix, TICKET_PREFIX_REGEX));
      }
    }
  }

  if (!jiraHost) {
    errors.push(new InputRequiredError(jiraHost));
  } else if (!DOMAIN_NAME_REGEX.test(jiraHost)) {
    errors.push(new RegexError(jiraHost, DOMAIN_NAME_REGEX));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
}
// #endregion

// #region Exports
export { verifyConfiguration };
// #endregion
