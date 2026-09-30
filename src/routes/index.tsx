import { createFileRoute } from '@tanstack/react-router'
import { ScamlexLanding } from '@/components/scamlex-landing'

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scamlex — Scam Detection & Link Analysis" },
      { name: "description", content: "Analyze suspicious messages and links with explainable heuristic detection, risk scoring, and browser protection." },
      { property: "og:title", content: "Scamlex — Scam Detection & Link Analysis" },
      { property: "og:description", content: "Catch suspicious messages, links, and deceptive web content before they become a problem." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: ScamlexLanding,
});

function IndexComponent() {
  return <ScamlexLanding />
}
