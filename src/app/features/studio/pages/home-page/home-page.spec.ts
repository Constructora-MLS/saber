import { TestBed } from '@angular/core/testing';
import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
    }).compileComponents();
    localStorage.clear();
  });

  it('renders the starter page in Spanish', async () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Diseña con intención');
    expect(page.querySelectorAll('mat-card').length).toBeGreaterThan(0);
  });

  it('switches between light and dark themes', () => {
    const fixture = TestBed.createComponent(HomePage);
    const page = fixture.componentInstance;

    page['toggleTheme']();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('saber-theme')).toBe('dark');
  });
});
