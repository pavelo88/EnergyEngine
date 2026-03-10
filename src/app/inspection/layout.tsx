'use client';

// This layout component has been refactored to focus solely on presentation.
// Authorization and data-fetching logic is now handled within the page components
// that this layout wraps, adhering to modern Next.js practices.
// This cleanup prepares the structure for the "Emulator" UI requested in Step 3.
export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  // This now acts as a clean shell for the inspection module's content.
  return <>{children}</>;
}
