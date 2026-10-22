// Package infrastructure holds the technical infrastructure that the bounded
// contexts of the application share.
//
// It knows nothing about the business domain: it only carries the facts of
// one context to the others.
// package infrastructure

import { Injectable } from '@angular/core';

/**
 * DomainEvent is a fact of a domain that already happened.
 */
export interface DomainEvent {
  /** The kind of the fact, used to subscribe to it. */
  readonly kind: string;
  /** The moment the fact happened. */
  readonly occurredOn: Date;
}

/**
 * DomainEventBus carries the domain events between the bounded contexts.
 *
 * A context publishes the facts of its domain and the other contexts decide
 * what they do with them. No context knows the internals of another one, so
 * the bus is the only door between them.
 */
@Injectable({ providedIn: 'root' })
export class DomainEventBus {
  private readonly listeners = new Map<string, Set<(event: DomainEvent) => void>>();

  /**
   * publish announces a fact to the contexts that subscribed to it.
   */
  publish<T extends DomainEvent>(event: T): void {
    const listeners = this.listeners.get(event.kind);
    if (!listeners) {
      return;
    }
    for (const listener of [...listeners]) {
      listener(event);
    }
  }

  /**
   * subscribe listens to the facts of a kind.
   *
   * It returns the function that stops the listening.
   */
  subscribe<T extends DomainEvent>(kind: T['kind'], listener: (event: T) => void): () => void {
    const listeners = this.listeners.get(kind) ?? new Set<(event: DomainEvent) => void>();
    const subscriber = listener as (event: DomainEvent) => void;
    listeners.add(subscriber);
    this.listeners.set(kind, listeners);

    return () => {
      listeners.delete(subscriber);
    };
  }
}
