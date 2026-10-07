'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Shell({ children, back }: { children: ReactNode; back?: { href: string; label: string } }) {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet/15 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-coral/10 blur-3xl" />
      <div className="relative z-10">
        {back && <Link href={back.href} className="inline-block px-5 pt-5 text-sm text-paper/70 hover:text-gold">← {back.label}</Link>}
        {children}
      </div>
    </main>
  );
}

export function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="card pop w-full max-w-sm text-center">
        <h2 className="mb-3 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-lg bg-cinnabar/20 px-3 py-2 text-sm text-red-200">{children}</p>;
}
