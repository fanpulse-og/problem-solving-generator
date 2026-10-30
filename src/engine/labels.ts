/**
 * Part labels are 'a', 'b', … or, for sub-parts, 'a(i)', 'a(ii)'.
 * They are shown as "a)" and "i)" (with the letter only on the first sub-part).
 */
export function splitLabel(label: string): { letter: string; roman?: string } {
  const m = label.match(/^([a-z]+)\(([ivx]+)\)$/);
  return m ? { letter: m[1], roman: m[2] } : { letter: label };
}

/** One-line form, for answers, mark schemes and reports: "a)", "a) ii)". */
export function partLabel(label: string): string {
  const { letter, roman } = splitLabel(label);
  return roman ? `${letter}) ${roman})` : `${letter})`;
}
