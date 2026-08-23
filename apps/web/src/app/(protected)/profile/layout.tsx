import type { ReactNode } from "react";

/**
 * Shared shell for the profile routes: the list, the add form and the edit
 * form all sit in the same column.
 *
 * No page heading here. The nav bar already says Profile, and repeating it
 * pushed the actual content a third of the way down the screen behind two
 * titles that said nothing the reader did not already know.
 */
export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 sm:p-6">
      {children}
    </div>
  );
}
