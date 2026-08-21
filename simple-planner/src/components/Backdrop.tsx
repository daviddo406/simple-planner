import { PixelCloud } from "@/components/ui/PixelCloud";
import { Slime } from "@/components/ui/Slime";
import { SLIME_IDS } from "@/lib/slimes";

/**
 * The page's scenery: pixel clouds along the top, the whole colony of slimes
 * standing along the bottom.
 *
 * Three things keep decoration from becoming a defect here.
 *
 * It is `fixed` and `-z-10`, so it never enters the flow, never moves a day
 * section, and never adds a scrollbar — `overflow-hidden` clips whatever runs
 * past the edge rather than widening the document.
 *
 * It is inert: `aria-hidden` and `pointer-events-none`, so it is invisible to
 * assistive technology and cannot swallow a click meant for a task.
 *
 * It only renders at `lg`, which is where the layout already goes two-column
 * and there is margin either side to draw in. Below that the week page fills
 * the viewport, and scenery behind text is just noise the reader has to see
 * past — the surfaces are opaque paper, so where they do overlap the scenery
 * is simply covered.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 hidden select-none overflow-hidden lg:block"
    >
      {/* Hand-placed rather than evenly spaced: a row of clouds at one pitch
          reads as a border. All offsets are on the 4px grid, and all of them
          hug the left and right edges — the middle of the top band is where
          the week header's type is, and that is unframed, so a cloud there
          would sit behind live text rather than behind opaque paper. */}
      <PixelCloud scale={3} className="absolute left-4 top-16" />
      <PixelCloud scale={2} flipped className="absolute left-16 top-56" />
      <PixelCloud scale={4} className="absolute right-8 top-8" />
      <PixelCloud scale={2} flipped className="absolute right-4 top-64" />

      {/* The colony, on the ground line. Every slime rather than the chosen
          one: the picker's job is to say which one is *yours*, and a parade of
          all twelve is what makes that reading obvious. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-12">
        {SLIME_IDS.map((id, index) => (
          <Slime
            key={id}
            id={id}
            scale={3}
            // Alternating heights, so the row is a crowd and not a ruler.
            // 4px steps, because a half-step would put the sprite between
            // device pixels at 1.5x and undo the crispness it is drawn for.
            className={index % 2 === 0 ? "mb-4" : "mb-10"}
          />
        ))}
      </div>
    </div>
  );
}
