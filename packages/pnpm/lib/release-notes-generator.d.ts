declare module '@semantic-release/release-notes-generator' {
  interface PluginConfig {}
  interface Context {}
  export async function generateNotes(
    pluginConfig: PluginConfig,
    context: Context
  ): Promise<string>;
}
