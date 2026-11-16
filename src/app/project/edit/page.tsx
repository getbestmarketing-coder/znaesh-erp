'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProjectForm } from '@/components/ProjectForm';

function Edit() { const id = useSearchParams().get('id'); return <ProjectForm key={id || ''} id={id || '__none'} />; }
export default function Page() { return <Suspense><Edit /></Suspense>; }
