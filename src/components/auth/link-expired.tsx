import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function LinkExpired() {
  return (
    <div className="space-y-6">
      <Alert tone="warning" title="This link has expired or has already been used">
        Links in our emails work once and expire after an hour. Ask for a new one and use it straight away.
      </Alert>
      <LinkButton href="/forgot-password" block size="lg">Send me a new link</LinkButton>
    </div>
  );
}
