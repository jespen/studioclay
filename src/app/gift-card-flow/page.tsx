'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GiftCardFlow() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/gift-card-flow/selection');
  }, [router]);

  return null;
} 