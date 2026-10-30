import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppSidebar } from './app-sidebar';

class Sidebar extends AppSidebar {
  openSettings() {
    return super.openSettings();
  }
}

afterEach(() => vi.unstubAllGlobals());

describe('AppSidebar', () => {
  it('removes the registered matchMedia callback when its destroy ref runs', () => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const addEventListener = vi.fn((_type: string, callback: EventListenerOrEventListenerObject) =>
      listeners.add(callback),
    );
    const removeEventListener = vi.fn(
      (_type: string, callback: EventListenerOrEventListenerObject) => listeners.delete(callback),
    );
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false, addEventListener, removeEventListener }),
    });
    const callbacks: (() => void)[] = [];
    const destroyRef = {
      onDestroy: (callback: () => void) => callbacks.push(callback),
    } as DestroyRef;
    const router = { navigateByUrl: vi.fn() } as unknown as Router;
    const injector = {
      get: (token: unknown) => {
        if (token === DestroyRef) {
          return destroyRef;
        }

        if (token === Router) {
          return router;
        }

        return undefined;
      },
    } as unknown as Injector;
    runInInjectionContext(injector, () => new Sidebar());
    const callback = [...listeners][0];
    expect(callback).toBeDefined();
    expect(callbacks.length).toBeGreaterThan(0);
    callbacks.forEach((destroy) => destroy());
    expect(addEventListener).toHaveBeenCalledWith('change', callback);
    expect(removeEventListener).toHaveBeenCalledWith('change', callback);
    expect(listeners.size).toBe(0);
  });

  it('takes the user to the configuration of the account', () => {
    const navigateByUrl = vi.fn();
    const destroyRef = { onDestroy: () => {} } as DestroyRef;
    const injector = {
      get: (token: unknown) => {
        if (token === DestroyRef) {
          return destroyRef;
        }

        if (token === Router) {
          return { navigateByUrl } as unknown as Router;
        }

        return undefined;
      },
    } as unknown as Injector;
    const sidebar = runInInjectionContext(injector, () => new Sidebar());

    sidebar.openSettings();

    expect(navigateByUrl).toHaveBeenCalledWith('/settings');
  });
});
