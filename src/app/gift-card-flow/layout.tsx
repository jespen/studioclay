import React from 'react';

export default function GiftCardFlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hide-navigation">
      {children}
    </div>
  );
} 