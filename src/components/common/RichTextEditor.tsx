'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import Quill styles
import 'react-quill-new/dist/quill.snow.css?inline'

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '200px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '4px', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <p>Laddar editor...</p>
    </div>
  )
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

// Define the toolbar modules for the Quill editor
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
  clipboard: {
    // Allow better pasting from Word, Google Docs, etc.
    matchVisual: false,
  },
};

// Formats supported by Quill
const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list',
  'link'
];

/**
 * A WYSIWYG editor using React-Quill-New with React 18 compatibility
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Skriv eller klistra in text här...",
  readOnly = false,
  style = {},
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  
  // Initialize on client-side only
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Show loading state while not mounted
  if (!mounted) {
    return (
      <div 
        style={{ 
          height: '200px', 
          border: '1px solid #e0e0e0', 
          borderRadius: '4px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
      >
        <p>Laddar editor...</p>
      </div>
    );
  }
  
  return (
    <div className="rich-text-editor-container" style={style}>
      <style jsx global>{`
        .rich-text-editor-container .ql-toolbar {
          border-color: #e0e0e0;
          border-top-left-radius: 4px;
          border-top-right-radius: 4px;
        }
        .rich-text-editor-container .ql-container {
          border-color: #e0e0e0;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          min-height: 200px;
        }
        .rich-text-editor-container .ql-editor {
          min-height: 200px;
        }
        .rich-text-editor-container .ql-picker-label:hover, 
        .rich-text-editor-container .ql-picker-label.ql-active {
          color: #547264;
        }
        .rich-text-editor-container .ql-picker-item:hover, 
        .rich-text-editor-container .ql-picker-item.ql-selected {
          color: #547264;
        }
        .rich-text-editor-container .ql-snow.ql-toolbar button:hover, 
        .rich-text-editor-container .ql-snow .ql-toolbar button:hover, 
        .rich-text-editor-container .ql-snow.ql-toolbar button.ql-active, 
        .rich-text-editor-container .ql-snow .ql-toolbar button.ql-active {
          color: #547264;
        }
        .rich-text-editor-container .ql-snow.ql-toolbar button:hover .ql-stroke, 
        .rich-text-editor-container .ql-snow .ql-toolbar button:hover .ql-stroke, 
        .rich-text-editor-container .ql-snow.ql-toolbar button.ql-active .ql-stroke, 
        .rich-text-editor-container .ql-snow .ql-toolbar button.ql-active .ql-stroke {
          stroke: #547264;
        }
        .rich-text-editor-container .ql-snow.ql-toolbar button:hover .ql-fill, 
        .rich-text-editor-container .ql-snow .ql-toolbar button:hover .ql-fill, 
        .rich-text-editor-container .ql-snow.ql-toolbar button.ql-active .ql-fill, 
        .rich-text-editor-container .ql-snow .ql-toolbar button.ql-active .ql-fill {
          fill: #547264;
        }
      `}</style>
      <ReactQuill
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        theme="snow"
      />
    </div>
  );
} 