export interface Clear {
  /** Empty the set, keeping locked questions. */
  clear: () => void;
  /** Put the cleared set back; only offered until the set changes again. */
  undo: () => void;
  canUndo: boolean;
  /** Locked questions in the set, which Clear keeps. */
  locked: number;
}

/** "Clear set" with an Undo line, so a fresh set doesn't pile onto an old one. Locked questions stay. */
export function ClearSet({ count, clear }: { count: number; clear: Clear }) {
  if (clear.canUndo)
    return (
      <span className="undo-bar" role="status">
        {clear.locked ? `Cleared, kept ${clear.locked} locked.` : 'Set cleared.'}{' '}
        <button type="button" className="link" onClick={clear.undo}>
          Undo
        </button>
      </span>
    );
  const all = count > 0 && clear.locked === count;
  return (
    <button type="button" onClick={clear.clear} disabled={count === 0 || all} title={all ? 'Every question is locked. Unlock some to clear them.' : undefined}>
      {all ? 'All locked' : clear.locked ? `Clear unlocked (keep ${clear.locked} locked)` : 'Clear set'}
    </button>
  );
}
