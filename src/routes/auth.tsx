import { createFileRoute } from '@tanstack/react-router';
import { ScamlexAuth } from '@/components/auth-page';

export const Route = createFileRoute('/auth')({
  component: ScamlexAuth,
});
