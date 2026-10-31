import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ListUsersQueryService } from '../../../application/query-services/user-query-services';
import { UserPage } from '../../../application/queries/user-queries';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { FilterableUserStatus } from '../../../domain/model/value-objects/user-status';
import { Paginator } from '../../../../shared/presentation/components/paginator/paginator';
import {
  DeletableUser,
  DeleteUserDialog,
} from '../../components/delete-user-dialog/delete-user-dialog';
import { InviteUserDialog } from '../../components/invite-user-dialog/invite-user-dialog';
import { UserRow, UserTable } from '../../components/user-table/user-table';
import { describeUserFailure, UserFailureMessage } from '../user-failures';

/**
 * The size of the page of accounts.
 */
const PAGE_SIZE = 20;

/**
 * UsersPage orchestrates the accounts of the platform.
 *
 * The page is the frontend controller of the bounded context: it reads the
 * listing through the use case and it opens the dialogs that invite and
 * disable an account. It never talks to the API directly.
 */
@Component({
  imports: [
    FormsModule,
    Paginator,
    UserTable,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  selector: 'app-users-page',
  styleUrl: './users.page.scss',
  templateUrl: './users.page.html',
})
export class UsersPage implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly listUsers = inject(ListUsersQueryService);
  private readonly destroyRef = inject(DestroyRef);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  /** The page that failed, so the retry asks for the same one. */
  private readonly failedPage = signal<number | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<FilterableUserStatus | ''>('');
  protected readonly rows = signal<readonly UserRow[]>([]);
  /** The number of the page that is shown, starting at one. */
  protected readonly page = signal(1);
  /** The number of pages of the listing. */
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadFailure = signal<UserFailureMessage | null>(null);

  /**
   * The headline of the state shown when the listing has no accounts.
   *
   * A search without results and an installation without accounts are
   * different situations, so the state names the one that happened.
   */
  protected readonly emptyTitle = computed(() =>
    this.searchTerm().trim().length > 0
      ? 'Ninguna cuenta coincide con la búsqueda'
      : 'Todavía no hay cuentas de acceso',
  );

  /**
   * The supporting text of the state shown when the listing has no
   * accounts.
   */
  protected readonly emptyMessage = computed(() =>
    this.searchTerm().trim().length > 0
      ? 'Prueba con otro nombre o con otro correo electrónico.'
      : 'Invita a la primera persona para verlo en esta lista.',
  );

  /**
   * The emblem of the state shown when the listing has no accounts.
   */
  protected readonly emptyIcon = computed(() =>
    this.searchTerm().trim().length > 0 ? 'person_search' : 'group_off',
  );

  constructor() {
    // The pending search is cancelled once, when the page goes away: the
    // callback is not registered on every keystroke.
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer !== null) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
    });
  }

  /**
   * ngOnInit loads the listing of accounts.
   *
   * The search lives in the page, never in the address of the browser, so
   * the url of the module stays clean and the menu keeps the item of the
   * page selected.
   */
  ngOnInit(): void {
    void this.reload();
  }

  /**
   * onSearchChanged reloads the listing after the search settles.
   */
  protected onSearchChanged(value: string): void {
    this.searchTerm.set(value);

    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.reload();
    }, 300);
  }

  /**
   * clearSearch empties the search of the listing.
   */
  protected clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.searchTerm.set('');
    void this.reload();
  }

  /**
   * onStatusChanged reloads the listing with the state that was chosen.
   */
  protected onStatusChanged(status: FilterableUserStatus | ''): void {
    this.statusFilter.set(status);
    void this.reload();
  }

  /**
   * goToPage shows another page of the listing.
   */
  protected goToPage(page: number): void {
    void this.load(page);
  }

  /**
   * retry consults the accounts again.
   *
   * The page that failed is asked again, so the administrator does not lose
   * the place that he was in.
   */
  protected retry(): void {
    void this.load(this.failedPage() ?? 1);
  }

  /**
   * openInviteDialog opens the dialog that invites a member.
   */
  protected openInviteDialog(): void {
    this.dialog
      .open(InviteUserDialog, { width: '32rem', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((invited) => {
        if (invited) {
          this.notify('Invitación enviada.');
          void this.reload();
        }
      });
  }

  /**
   * openDeleteDialog opens the dialog that removes the access of an account.
   */
  protected openDeleteDialog(row: UserRow): void {
    const account: DeletableUser = {
      id: row.id,
      name: row.name || row.email,
      email: row.email,
      status: row.status,
    };

    this.dialog
      .open(DeleteUserDialog, { data: account, width: '34rem', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          this.notify('Cuenta eliminada.');
          void this.reload();
        }
      });
  }

  /**
   * reload brings the first page of the accounts.
   */
  private async reload(): Promise<void> {
    await this.load(1);
  }

  /**
   * load asks the use case for a page of the accounts.
   */
  private async load(page: number): Promise<void> {
    this.loading.set(true);
    this.loadFailure.set(null);

    try {
      const result = await this.listUsers.execute({
        search: this.searchTerm().trim() || undefined,
        status: this.statusFilter() || undefined,
        page,
        limit: PAGE_SIZE,
      });

      this.publish(result);
    } catch (error) {
      this.failedPage.set(page);
      this.loadFailure.set(describeUserFailure(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * publish stores the page that was read.
   */
  private publish(result: UserPage<PlatformUser>): void {
    this.rows.set(result.items.map((user) => this.toRow(user)));
    this.page.set(result.page);
    this.totalPages.set(result.totalPages);
    this.failedPage.set(null);
  }

  /**
   * toRow presents an account in the table.
   */
  private toRow(user: PlatformUser): UserRow {
    return {
      id: user.id.value,
      name: user.fullName,
      email: user.email,
      status: user.status,
    };
  }

  /**
   * notify shows the outcome of an action.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
