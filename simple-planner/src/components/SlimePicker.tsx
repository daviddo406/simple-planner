"use client";

import { useOptimistic, useTransition } from "react";
import { setSlime } from "@/app/actions";
import { Slime } from "@/components/ui/Slime";
import { PixelFrame } from "@/components/ui/PixelFrame";
import { SLIME_IDS, type SlimeId } from "@/lib/slimes";

/**
 * Sits under the mini calendar, inline. No modal and no settings route:
 * twelve 16px swatches fit in the sidebar, and a whole screen for one
 * preference is not warranted.
 *
 * Each swatch is a real `<input type="radio">`, so arrow keys move between
 * slimes and the focus ring lands where a keyboard user expects — native
 * radio-group behaviour, intact.
 */
export function SlimePicker({ selected }: { selected: SlimeId }) {
  const [, startTransition] = useTransition();
  const [optimistic, choose] = useOptimistic(selected);

  function onChoose(id: SlimeId) {
    startTransition(async () => {
      choose(id);
      await setSlime(id);
    });
  }

  return (
    <PixelFrame as="fieldset" className="p-3">
      <legend className="px-2 font-display text-display-sm uppercase text-ink-soft">Slime</legend>
      <div className="grid grid-cols-6 gap-2">
        {SLIME_IDS.map((id) => (
          <label
            key={id}
            className={[
              "flex size-8 cursor-pointer items-center justify-center border-2",
              optimistic === id ? "border-ink" : "border-transparent hover:border-ink-ghost",
            ].join(" ")}
          >
            <input
              type="radio"
              name="slime"
              value={id}
              checked={optimistic === id}
              onChange={() => onChoose(id)}
              aria-label={id}
              className="sr-only"
            />
            <Slime id={id} scale={1} />
          </label>
        ))}
      </div>
    </PixelFrame>
  );
}
