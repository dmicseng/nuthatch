import { PrismaClient, VendorCategory } from '@prisma/client';

const prisma = new PrismaClient();

type VendorSeed = {
  slug: string;
  name: string;
  category: VendorCategory;
  website: string;
};

const vendors: VendorSeed[] = [
  // cloud
  { slug: 'aws', name: 'Amazon Web Services', category: 'cloud', website: 'https://aws.amazon.com' },
  { slug: 'gcp', name: 'Google Cloud', category: 'cloud', website: 'https://cloud.google.com' },
  { slug: 'azure', name: 'Microsoft Azure', category: 'cloud', website: 'https://azure.microsoft.com' },
  { slug: 'cloudflare', name: 'Cloudflare', category: 'cloud', website: 'https://www.cloudflare.com' },
  { slug: 'vercel', name: 'Vercel', category: 'cloud', website: 'https://vercel.com' },
  { slug: 'fly-io', name: 'Fly.io', category: 'cloud', website: 'https://fly.io' },
  { slug: 'railway', name: 'Railway', category: 'cloud', website: 'https://railway.com' },
  { slug: 'linode', name: 'Linode', category: 'cloud', website: 'https://www.linode.com' },

  // ai
  { slug: 'openai', name: 'OpenAI', category: 'ai', website: 'https://openai.com' },
  { slug: 'anthropic', name: 'Anthropic', category: 'ai', website: 'https://www.anthropic.com' },
  { slug: 'replicate', name: 'Replicate', category: 'ai', website: 'https://replicate.com' },
  { slug: 'hugging-face', name: 'Hugging Face', category: 'ai', website: 'https://huggingface.co' },

  // design
  { slug: 'figma', name: 'Figma', category: 'design', website: 'https://www.figma.com' },
  { slug: 'canva', name: 'Canva', category: 'design', website: 'https://www.canva.com' },
  { slug: 'framer', name: 'Framer', category: 'design', website: 'https://www.framer.com' },

  // comms
  { slug: 'slack', name: 'Slack', category: 'comms', website: 'https://slack.com' },
  { slug: 'discord', name: 'Discord', category: 'comms', website: 'https://discord.com' },
  { slug: 'line-oa', name: 'LINE Official Account', category: 'comms', website: 'https://www.linebiz.com' },
  { slug: 'zoom', name: 'Zoom', category: 'comms', website: 'https://zoom.us' },

  // dev
  { slug: 'github', name: 'GitHub', category: 'dev', website: 'https://github.com' },
  { slug: 'gitlab', name: 'GitLab', category: 'dev', website: 'https://gitlab.com' },
  { slug: 'linear', name: 'Linear', category: 'dev', website: 'https://linear.app' },
  { slug: 'notion', name: 'Notion', category: 'dev', website: 'https://www.notion.com' },
  { slug: 'sentry', name: 'Sentry', category: 'dev', website: 'https://sentry.io' },
  { slug: 'posthog', name: 'PostHog', category: 'dev', website: 'https://posthog.com' },

  // finance
  { slug: 'stripe', name: 'Stripe', category: 'finance', website: 'https://stripe.com' },
  { slug: 'omise', name: 'Omise', category: 'finance', website: 'https://www.omise.co' },
  { slug: '2c2p', name: '2C2P', category: 'finance', website: 'https://www.2c2p.com' },
];

async function main() {
  await Promise.all(
    vendors.map((vendor) =>
      prisma.vendor.upsert({
        where: { slug: vendor.slug },
        create: vendor,
        update: {
          name: vendor.name,
          category: vendor.category,
          website: vendor.website,
        },
      }),
    ),
  );

  console.log(`Vendor catalog seeded: ${vendors.length} vendors.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
