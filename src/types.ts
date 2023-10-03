export interface PluginTypes {
  /**
   * Enable or disable plugin
   * @default false
   */
  enabled?: boolean
}


export interface File {
  buffer: Buffer
  filename: string
  filesize: number
  mimeType: string
  tempFilePath?: string
}