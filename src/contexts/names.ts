import type { Rng } from '../engine/rng';

/**
 * First names reflecting the range of names in UK classrooms. Templates
 * use names rather than pronouns ("Amara buys…", "Amara's bag"), as the
 * papers do, so no pronoun data is needed.
 */
export const NAMES = [
  'Aaliyah', 'Aarav', 'Abdul', 'Ade', 'Aisha', 'Alfie', 'Amara', 'Amelia', 'Ananya', 'Arjun',
  'Ava', 'Ayesha', 'Ben', 'Bilal', 'Bronwen', 'Callum', 'Chen', 'Chloe', 'Ciara', 'Dafydd',
  'Daniel', 'Deepa', 'Eilidh', 'Elif', 'Ella', 'Emeka', 'Erin', 'Esme', 'Ewan', 'Fatima',
  'Finn', 'Freya', 'Grace', 'Hamza', 'Hannah', 'Harry', 'Ibrahim', 'Imogen', 'Isla', 'Jack',
  'Jakub', 'Jasmine', 'Jaya', 'Kai', 'Kemi', 'Kofi', 'Layla', 'Leah', 'Liam', 'Lily',
  'Lucas', 'Mai', 'Maryam', 'Mason', 'Matteo', 'Maya', 'Mei', 'Mohammed', 'Nadia', 'Niamh',
  'Noah', 'Oliver', 'Oscar', 'Owen', 'Priya', 'Rhys', 'Riya', 'Rory', 'Ruby', 'Sam',
  'Samir', 'Sana', 'Seren', 'Sofia', 'Tariq', 'Theo', 'Tomasz', 'Usman', 'Yasmin', 'Zara',
  'Zoya', 'Zain',
] as const;

/** `count` different names. */
export function names(rng: Rng, count: number): string[] {
  return rng.sample(NAMES, count);
}

export function possessive(name: string): string {
  return `${name}’s`;
}
