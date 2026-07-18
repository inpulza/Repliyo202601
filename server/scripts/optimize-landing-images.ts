import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const outputDirectory = path.join(
  repositoryRoot,
  "client/src/assets/landing/optimized",
);

type ImageSpec = {
  source: string;
  output: string;
  width: number;
  height: number;
};

const customerAvatars = [
  ["maria_customer_avatar_headshot.png", "customer-maria-192.webp"],
  ["carlos_customer_avatar_headshot.png", "customer-carlos-192.webp"],
  ["ana_customer_avatar_headshot.png", "customer-ana-192.webp"],
  ["hispanic_man_gym_selfie.png", "customer-diego-192.webp"],
  ["latina_woman_with_dog.png", "customer-laura-192.webp"],
] as const;

const agentAvatars = [
  ["ana_agent_headshot_portrait.png", "agent-ana-96.webp"],
  ["luis_agent_headshot_portrait.png", "agent-luis-96.webp"],
  ["sara_agent_headshot_portrait.png", "agent-sara-96.webp"],
  ["carlos_agent_headshot_portrait.png", "agent-carlos-96.webp"],
  ["maria_agent_headshot_portrait.png", "agent-maria-96.webp"],
] as const;

const testimonials = [
  ["testimonial-bettys.jpg", "testimonial-bettys"],
  ["testimonial-melva-optimized.jpg", "testimonial-melva"],
  ["testimonial-xlhomes-optimized.jpg", "testimonial-xlhomes"],
] as const;

const manifest: ImageSpec[] = [
  ...customerAvatars.map(([source, output]) => ({
    source: `attached_assets/generated_images/${source}`,
    output,
    width: 192,
    height: 192,
  })),
  ...agentAvatars.map(([source, output]) => ({
    source: `attached_assets/generated_images/${source}`,
    output,
    width: 96,
    height: 96,
  })),
  ...testimonials.flatMap(([source, output]) =>
    [96, 192].map((size) => ({
      source: `client/src/assets/${source}`,
      output: `${output}-${size}.webp`,
      width: size,
      height: size,
    })),
  ),
  ...[128, 256].map((size) => ({
    source: "client/src/assets/repliyo-logo.jpg",
    output: `repliyo-logo-${size}.webp`,
    width: size,
    height: size,
  })),
];

async function renderImage(spec: ImageSpec) {
  return sharp(path.join(repositoryRoot, spec.source))
    .rotate()
    .resize(spec.width, spec.height, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 82 })
    .toBuffer();
}

async function main() {
  const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--check");
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArguments.join(", ")}`);
  }

  const checkOnly = process.argv.includes("--check");
  const mismatches: string[] = [];

  if (!checkOnly) {
    await fs.mkdir(outputDirectory, { recursive: true });
  }

  for (const spec of manifest) {
    const rendered = await renderImage(spec);
    const outputPath = path.join(outputDirectory, spec.output);

    if (!checkOnly) {
      await fs.writeFile(outputPath, rendered);
      continue;
    }

    try {
      const existing = await fs.readFile(outputPath);
      if (!existing.equals(rendered)) {
        mismatches.push(`${spec.output} differs from its source`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        mismatches.push(`${spec.output} is missing`);
        continue;
      }
      throw error;
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Landing image check failed:\n- ${mismatches.join("\n- ")}\nRun npm run optimize:landing-images.`,
    );
  }

  const action = checkOnly ? "Verified" : "Generated";
  console.log(`${action} ${manifest.length} optimized landing images.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
