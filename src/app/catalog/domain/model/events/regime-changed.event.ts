// Package events holds the domain events of the Catalog bounded context.
//
// An event is a fact that already happened. The other contexts of the
// application react to it without knowing the internals of this one.
// package events

/**
 * The kind of the fact that a labor regime of the catalog changed.
 *
 * It is the key the other contexts subscribe to.
 */
export const REGIME_CHANGED = 'RegimeChanged';

/**
 * RegimeChangedEvent is the fact that a labor regime of the catalog
 * changed.
 *
 * The event carries only the identifier of the regime: the contexts that
 * read the catalog need to know that it moved, not what it holds.
 */
export interface RegimeChangedEvent {
  /** The kind of the fact, used to subscribe to it. */
  readonly kind: typeof REGIME_CHANGED;
  /** The identifier of the regime that changed. */
  readonly regimeId: string;
  /** The moment the fact happened. */
  readonly occurredOn: Date;
}
