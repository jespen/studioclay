'use client';

import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import Link from 'next/link';
// Use simplified approach without complex imports
// import TemplateManager from '@/components/admin/Courses/TemplateManager';
// import TemplateEditor from '@/components/admin/Courses/TemplateEditor';
// import { CourseTemplate } from '@/types/course';
import styles from '../dashboard/courses/courses.module.css';

// Define a minimal CourseTemplate type
type CourseTemplate = {
  id: string;
  title?: string;
  categorie?: string;
  rich_description?: string | null;
  is_published?: boolean;
  published?: boolean;
  category_id?: string;
};

export default function TemplatesPage() {
  const [editingTemplate, setEditingTemplate] = useState<CourseTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Simplified placeholder page
  return (
    <div className={styles.pageContainer}>
      {/* Simplified header */}
      <header className={styles.adminHeader || 'p-4 bg-gray-100 flex justify-between'}>
        <div>
          <h1 className="text-2xl font-bold">Kursmallar</h1>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/admin/dashboard">Kurser</Link>
            </li>
            <li>
              <Link href="/admin/dashboard/templates">Mallar</Link>
            </li>
            <li>
              <Link href="/admin/dashboard/gift-cards">Presentkort</Link>
            </li>
          </ul>
        </nav>
      </header>
      
      <main className={styles.mainContent || 'p-4'}>
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-2">Mallhantering tillfälligt inte tillgänglig</h2>
          <p>Vi arbetar med att uppdatera denna funktion.</p>
          <div className="mt-4">
            <Link 
              href="/admin/dashboard"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded"
            >
              Tillbaka till dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 