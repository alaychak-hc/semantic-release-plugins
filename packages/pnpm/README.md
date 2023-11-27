# TODO

[Reference](https://github.com/iamludal/semantic-release-jira-notes)

## Title Options

Name | type | Description | Default
--- | --- | ---
`name` | string | The title that is used for the release notes. | `Release Notes`
`includeCompareLink` | boolean | Whether to include the link to the comparison between the version being released and the previous one. | `true`
`date` | string | The date format for the release. Must be a valid [date-fns](https://date-fns.org/v2.16.1/docs/format) format. | `yyyy-MM-dd`
`jira` | JiraOptions | The Jira options. | [See below](#jira-options)

## Commit Options

Name | type | Description | Default
--- | --- | ---
`groups` | GroupOptions[] | The title that is used for the release notes. | [See below](#commit-groups)

### Commit Groups

Name | type | Description | Default
--- | --- | ---
`id` | string | The id of the group. | 
`type` | string / string[] | The type of the commit. | `['feat', 'fix', 'perf', 'revert', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'chore']. Other types can be added.`
`scope` | string / string[] | The scope of the commit. | `['*']. Undefined scopes will be considered as *`
`section` | string | The section of the release notes where the commit will be added. |

### Jira Options

Name | type | Description | Default
--- | --- | ---
`host` | string | The Jira host. |
