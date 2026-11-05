/**
 * Page counts for the worksheet. A website can't ask the browser how many pages
 * it will print, so the worksheet measures each block at print size and this
 * lays them out the way the print rules do: a block is never split across pages,
 * and a heading stays with what follows it.
 */
export interface PageBlock {
  /** Height of the block alone. */
  height: number;
  /** Height including the gap before the next block. */
  advance: number;
  /** A heading: never left alone at the foot of a page. */
  keepWithNext?: boolean;
}

/** A4 at 96 dots to the inch, less the print margins of 14 mm and 16 mm. */
export const PAGE_HEIGHT = ((297 - 14 - 16) / 25.4) * 96;

export function countPages(blocks: PageBlock[], pageHeight = PAGE_HEIGHT): number {
  if (blocks.length === 0) return 0;
  let pages = 1;
  let y = 0;
  for (let i = 0; i < blocks.length; i++) {
    // A heading needs room for itself and the start of the next block.
    let need = blocks[i].height;
    let run = 0;
    for (let j = i; blocks[j].keepWithNext && j + 1 < blocks.length; j++) {
      run += blocks[j].advance;
      need = run + blocks[j + 1].height;
    }
    if (y > 0 && y + need > pageHeight) {
      pages++;
      y = 0;
    }
    y += blocks[i].advance;
  }
  return pages;
}

/**
 * Which questions to take out to fit a page limit: the tallest first, as that
 * removes the fewest. Each block holds the question it belongs to, if any.
 */
export function questionsToRemove(blocks: (PageBlock & { question?: string })[], limit: number, pageHeight = PAGE_HEIGHT): string[] {
  const left = [...blocks];
  const removed: string[] = [];
  while (countPages(left, pageHeight) > limit) {
    let tallest = -1;
    left.forEach((b, i) => {
      if (b.question && (tallest < 0 || b.advance > left[tallest].advance)) tallest = i;
    });
    if (tallest < 0) break;
    removed.push(left[tallest].question!);
    left.splice(tallest, 1);
  }
  return removed;
}
