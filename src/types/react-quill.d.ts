declare module 'react-quill' {
  import React from 'react';
  
  export interface ReactQuillProps {
    theme?: string;
    value?: string;
    onChange?: (value: string) => void;
    modules?: any;
    formats?: string[];
    style?: React.CSSProperties;
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
    id?: string;
    [key: string]: any;
  }
  
  const ReactQuill: React.FC<ReactQuillProps>;
  
  export default ReactQuill;
} 