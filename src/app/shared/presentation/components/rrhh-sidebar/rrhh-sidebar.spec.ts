import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RrhhSidebar } from './rrhh-sidebar';

afterEach(() => vi.unstubAllGlobals());

describe('RrhhSidebar', () => {
  it('removes the registered matchMedia callback when its destroy ref runs', () => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const addEventListener = vi.fn((_type: string, callback: EventListenerOrEventListenerObject) => listeners.add(callback));
    const removeEventListener = vi.fn((_type: string, callback: EventListenerOrEventListenerObject) => listeners.delete(callback));
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener, removeEventListener }) });
    const callbacks: (() => void)[] = [];
    const destroyRef = { onDestroy: (callback: () => void) => callbacks.push(callback) } as DestroyRef;
    const injector = {
      get: (token: unknown) => token === DestroyRef ? destroyRef : undefined,
    } as unknown as Injector;
    runInInjectionContext(injector, () => new RrhhSidebar());
    const callback = [...listeners][0];
    expect(callback).toBeDefined();
    expect(callbacks.length).toBeGreaterThan(0);
    callbacks.forEach((destroy) => destroy());
    expect(addEventListener).toHaveBeenCalledWith('change', callback);
    expect(removeEventListener).toHaveBeenCalledWith('change', callback);
    expect(listeners.size).toBe(0);
  });
});
