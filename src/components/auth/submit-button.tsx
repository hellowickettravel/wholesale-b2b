"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button that disables itself and shows a spinner while its form is pending. */
export function SubmitButton({ children, pendingText, block = true }: { children: ReactNode; pendingText?: string; block?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block={block} loading={pending}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
