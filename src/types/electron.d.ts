export {};

declare global {
  interface Window {
    presetAPI?: {
      isElectron: true;
      scanAdobePresetDirs: () => Promise<{
        mediaEncoderInstalled: boolean;
        premiereInstalled: boolean;
        presetDirs: string[];
      }>;
      installPreset: (
        targets: string[],
        fileName: string,
        content: string
      ) => Promise<{ path: string; success: boolean; error?: string }[]>;
      choosePresetFolder: () => Promise<string | null>;
      showItemInFolder: (filePath: string) => Promise<void>;
      getPathForFile: (file: File) => string;
      analyzeLoudness: (filePath: string) => Promise<{
        success: boolean;
        lufs?: number;
        truePeakDb?: number;
        error?: string;
      }>;
    };
  }
}
