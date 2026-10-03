"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Inner() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
      <Button variant="secondary" onClick={() => toast({ tone: "success", message: "Payment recorded" })}>Success toast</Button>
      <Button variant="secondary" onClick={() => toast({ tone: "danger", message: "Could not save. Try again." })}>Error toast</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Record a payment"
        description="Order #1051 · Spice Route Ltd"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save payment</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">Dialog body content goes here.</p>
      </Dialog>
    </div>
  );
}

export function DemoInteractive() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
