/** Only a type mechanic. Each native domain keeps its own producer and checker.
 * A candidate intentionally lacks the final derivative evidence and authority. */
export type DecisionCandidate<T> = T extends unknown ? Readonly<Omit<T, 'derivative'>> : never;
