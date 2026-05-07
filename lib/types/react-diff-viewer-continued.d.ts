declare module 'react-diff-viewer-continued' {
  import type { ComponentType } from 'react';

  interface ReactDiffViewerProps {
    oldValue?: string;
    newValue?: string;
    splitView?: boolean;
    leftTitle?: string;
    rightTitle?: string;
    useDarkTheme?: boolean;
    hideLineNumbers?: boolean;
    showDiffOnly?: boolean;
    [key: string]: unknown;
  }

  const ReactDiffViewer: ComponentType<ReactDiffViewerProps>;
  export default ReactDiffViewer;
}
