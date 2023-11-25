declare module '@semantic-release/commit-analyzer' {
  async function analyzeCommits(
    pluginConfig: PluginOptions,
    context: IAnalyzeCommitsContext
  ): Promise<string | null>;
}
