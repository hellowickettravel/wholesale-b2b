import { PlateMessage } from "@/components/brand/plate-message";
import { LinkButton } from "@/components/ui/button";

export function LinkExpired() {
  return (
    <PlateMessage
      fit="full"
      title="This link has expired"
      actions={<LinkButton href="/forgot-password" size="lg">Send me a new link</LinkButton>}
    >
      <p>Links in our emails work once and expire after an hour. Ask for a new one and use it straight away.</p>
    </PlateMessage>
  );
}
