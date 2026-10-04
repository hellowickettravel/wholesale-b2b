"use client";
import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/validation/auth";

/**
 * Upload or remove a photo. The server checks the actual bytes (JPEG/PNG/WebP, max 5 MB);
 * the accept attribute and size check here are only for a quicker message.
 */
export function PhotoForm({
  imageUrl,
  upload,
  remove,
  placeholder,
  label = "Photo",
}: {
  imageUrl: string | null;
  upload: (prev: FormState, fd: FormData) => Promise<FormState>;
  remove: () => Promise<FormState>;
  placeholder: React.ReactNode;
  label?: string;
}) {
  const [state, action, pending] = useActionState(upload, {});
  const [removing, startRemove] = useTransition();
  const [removeState, setRemoveState] = useState<FormState>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [tooBig, setTooBig] = useState(false);
  // After a successful upload or removal the server sends a new imageUrl: drop the local preview.
  const [seenUrl, setSeenUrl] = useState(imageUrl);
  if (seenUrl !== imageUrl) {
    setSeenUrl(imageUrl);
    setPreview(null);
  }
  const shown = preview ?? imageUrl;
  const message = removeState.notice || removeState.error ? removeState : state;

  return (
    <form action={action} className="space-y-3" key={imageUrl ?? "none"}>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-line bg-raised">
        {shown ? <Image src={shown} alt={`${label} preview`} fill sizes="320px" className="object-contain p-2" unoptimized={!!preview} /> : placeholder}
      </div>
      {message.error ? <Alert tone="danger">{message.error}</Alert> : null}
      {message.notice ? <Alert tone="success">{message.notice}</Alert> : null}
      {tooBig ? <Alert tone="warning">That file is over 5 MB. Choose a smaller photo.</Alert> : null}
      <label className="block">
        <span className="sr-only">Choose a photo</span>
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-line-strong file:bg-raised file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-sunken"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setRemoveState({});
            setTooBig(!!f && f.size > 5 * 1024 * 1024);
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={pending} disabled={!preview || tooBig} icon={<ImagePlus className="size-4" aria-hidden="true" />}>
          Upload photo
        </Button>
        {imageUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            loading={removing}
            icon={<Trash2 className="size-4" aria-hidden="true" />}
            onClick={() => startRemove(async () => setRemoveState(await remove()))}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-ink-subtle">JPEG, PNG or WebP, up to 5 MB. Square photos on a plain background look best.</p>
    </form>
  );
}
