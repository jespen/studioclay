'use client';

import React from 'react';
import '@/styles/richText.css';

interface RichTextProps {
  content: string;
}

/** Renders HTML produced by the admin rich text editor. */
const RichText: React.FC<RichTextProps> = ({ content }) => {
  return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: content }} />;
};

export default RichText;
