import { notFound } from "next/navigation";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import { PixelFrame } from "@/components/ui/PixelFrame";
import { PixelCloud } from "@/components/ui/PixelCloud";
import { Slime } from "@/components/ui/Slime";
import { SLIMES, SLIME_IDS } from "@/lib/slimes";

/**
 * Dev-only. Renders every token, both faces at every step of the ladder, and
 * every primitive in every state, with no application logic anywhere in it —
 * so the theme can be reviewed on its own, before nine components are built
 * out of it and retrofitting becomes the only option.
 *
 * Never reachable in a production build, which is why the E2E suite and the
 * deployed app never see it.
 */
export const dynamic = "force-static";

const INKS = [
  ["ink", "bg-ink", "15.48:1", "body text, borders, the hard shadow"],
  ["ink-soft", "bg-ink-soft", "8.59:1", "secondary text"],
  ["ink-faint", "bg-ink-faint", "4.84:1", "rules and de-emphasised labels"],
  ["ink-ghost", "bg-ink-ghost", "3.12:1", "padding cells, disabled controls"],
  ["accent", "bg-accent", "3.59:1", "the chosen slime; fill-only, never text"],
] as const;

const DISPLAY_LADDER = [
  ["display-lg", "text-display-lg", "32px / 40px — 4x Silkscreen"],
  ["display-md", "text-display-md", "24px / 32px — 3x Silkscreen"],
  ["display-sm", "text-display-sm", "16px / 24px — 2x Silkscreen"],
] as const;

const BODY_LADDER = [
  ["body", "text-body", "22px / 32px — 2x Departure Mono"],
  ["body-sm", "text-body-sm", "11px / 16px — 1x, below the 16px body floor"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-display-md uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function SpecimenPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-240 flex-col gap-12 p-8">
      <h1 className="font-display text-display-lg uppercase">Specimen</h1>

      <Section title="Palette">
        <PixelFrame className="flex flex-col gap-3 p-4">
          {INKS.map(([name, swatch, contrast, use]) => (
            <div key={name} className="flex items-center gap-4 whitespace-nowrap">
              <div className={`size-8 shrink-0 border-2 border-ink ${swatch}`} />
              <span className="font-display text-display-sm w-44 uppercase">{name}</span>
              <span className="font-display text-display-sm w-24">{contrast}</span>
              <span className="text-body-sm text-ink-soft">{use}</span>
            </div>
          ))}
        </PixelFrame>
      </Section>

      <Section title="Display face — Silkscreen">
        <PixelFrame className="flex flex-col gap-4 p-4">
          {DISPLAY_LADDER.map(([name, size, note]) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="text-body-sm text-ink-soft">{note}</span>
              <span data-specimen={name} className={`font-display ${size} uppercase`}>
                JUL 2026 — MTWTFSS 0123456789
              </span>
            </div>
          ))}
        </PixelFrame>
      </Section>

      <Section title="Body face — Departure Mono">
        <PixelFrame className="flex flex-col gap-4 p-4">
          {BODY_LADDER.map(([name, size, note]) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="text-body-sm text-ink-soft">{note}</span>
              <span data-specimen={name} className={`font-body ${size}`}>
                ship the thing — water plants — Independence Day
              </span>
            </div>
          ))}
        </PixelFrame>
      </Section>

      <Section title="Frames">
        <div className="flex flex-wrap items-start gap-8">
          <PixelFrame className="p-4">
            <span className="font-display text-display-sm uppercase">Flat</span>
          </PixelFrame>
          <PixelFrame raised className="p-4">
            <span className="font-display text-display-sm uppercase">Raised</span>
          </PixelFrame>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <PixelButton>Add</PixelButton>
          <PixelButton>&#9668;</PixelButton>
          <PixelButton>&#9658;</PixelButton>
          <PixelButton disabled>Disabled</PixelButton>
        </div>
        <p className="text-body-sm text-ink-soft">
          Press one: the shadow does not fade, the button jumps 2px into it.
        </p>
      </Section>

      <Section title="Checkbox">
        <PixelFrame className="flex flex-col gap-3 p-4">
          <label className="flex items-center gap-3">
            <PixelCheckbox />
            <span>unchecked</span>
          </label>
          <label className="flex items-center gap-3">
            <PixelCheckbox defaultChecked />
            <span>checked</span>
          </label>
          <label className="flex items-center gap-3 text-ink-ghost">
            <PixelCheckbox disabled />
            <span>disabled</span>
          </label>
        </PixelFrame>
      </Section>

      <Section title="Inputs">
        <PixelFrame className="flex flex-col gap-4 p-4">
          <input
            aria-label="specimen text input"
            placeholder="type a task"
            className="w-full border-2 border-ink bg-paper px-3 py-2 placeholder:text-ink-ghost"
          />
        </PixelFrame>
      </Section>

      <Section title="Slimes">
        <PixelFrame className="flex flex-col gap-4 p-4">
          <span className="text-body-sm text-ink-soft">
            Twelve variants of one 16&#215;14 shape, at 1&#215; (picker) and 2&#215; (header). Never
            1.5&#215;.
          </span>
          <div className="flex flex-wrap gap-4">
            {SLIME_IDS.map((id) => (
              <div key={id} className="flex flex-col items-center gap-2">
                <Slime id={id} scale={2} />
                <Slime id={id} scale={1} />
                <span className="text-body-sm text-ink-soft">{id}</span>
                <span
                  aria-hidden
                  title={`${id} shade — the accent when this slime is chosen`}
                  className="h-2 w-8"
                  style={{ background: SLIMES[id].shade }}
                />
              </div>
            ))}
          </div>
        </PixelFrame>
      </Section>

      <Section title="Backdrop">
        <PixelFrame className="flex flex-col gap-4 p-4">
          <span className="text-body-sm text-ink-soft">
            One 24&#215;9 cloud, mirrored and rescaled rather than redrawn. Its body is{" "}
            <code>--color-cloud</code>, a half-step lighter than paper: on the page it sits behind
            everything, so any real contrast would read as a surface instead of as sky.
          </span>
          <div className="flex flex-wrap items-end gap-8">
            <PixelCloud scale={1} />
            <PixelCloud scale={2} />
            <PixelCloud scale={3} flipped />
            <PixelCloud scale={4} />
          </div>
        </PixelFrame>
      </Section>

      <Section title="Focus">
        <p className="text-body-sm text-ink-soft">
          Tab through everything above. The ring is square, 2px, offset 2px, and present on every
          control — it is the only affordance a keyboard user gets on a theme with no hover
          elevation.
        </p>
      </Section>
    </main>
  );
}
