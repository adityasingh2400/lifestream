'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Knowledge page now redirects to home since the 3D graph is the main experience
export default function KnowledgePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);
  
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-white/60">Redirecting...</div>
    </div>
  );
}
