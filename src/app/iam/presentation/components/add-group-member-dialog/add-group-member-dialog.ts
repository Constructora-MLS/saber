import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AssignGroupMemberCommandService } from '../../../application/command-services/group-command-services';
import { ListUsersQueryService } from '../../../application/query-services/user-query-services';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { describeMembershipFailure } from '../../pages/group-failures';

/**
 * AddGroupMemberData is the role that receives the accounts.
 */
export interface AddGroupMemberData {
  /** The identifier of the role. */
  readonly groupId: string;
  /** The name of the role, so the administrator knows what he is changing. */
  readonly groupName: string;
  /** The identifiers of the accounts that already belong to the role. */
  readonly memberIds: readonly string[];
}

/**
 * The smallest term that the listing of the accounts accepts.
 *
 * The backend refuses the terms that are shorter than two characters, so
 * the dialog does not ask the platform for them.
 */
const MIN_SEARCH_LENGTH = 2;

/** The size of the page of accounts that the dialog shows. */
const ACCOUNTS_PAGE = 20;

/** The wait before the term of the search is asked to the platform. */
const SEARCH_DELAY = 300;

/**
 * AddGroupMemberDialog adds accounts to a role.
 *
 * The dialog asks the platform for the accounts of the organization, it
 * lets the administrator choose several of them and it assigns the chosen
 * ones to the role.
 */
@Component({
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  selector: 'app-add-group-member-dialog',
  styleUrl: './add-group-member-dialog.scss',
  templateUrl: './add-group-member-dialog.html',
})
export class AddGroupMemberDialog implements OnInit {
  private readonly listUsers = inject(ListUsersQueryService);
  private readonly assignMember = inject(AssignGroupMemberCommandService);
  private readonly dialogRef =
    inject<MatDialogRef<AddGroupMemberDialog, boolean>>(MatDialogRef);

  /** The role that receives the accounts. */
  protected readonly data = inject<AddGroupMemberData>(MAT_DIALOG_DATA);

  protected readonly searchTerm = signal('');
  protected readonly accounts = signal<readonly PlatformUser[]>([]);
  protected readonly selected = signal<readonly string[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void this.load();
  }

  /** onSearchChanged asks the platform for the accounts that match the term. */
  protected onSearchChanged(term: string): void {
    this.searchTerm.set(term);
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.load();
    }, SEARCH_DELAY);
  }

  /** search asks the platform for the accounts right away. */
  protected async search(): Promise<void> {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    await this.load();
  }

  /** toggle chooses or unchooses an account. */
  protected toggle(id: string): void {
    this.selected.update((ids) =>
      ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id],
    );
  }

  /** isSelected reports whether the administrator chose the account. */
  protected isSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  /** isMember reports whether the account already belongs to the role. */
  protected isMember(id: string): boolean {
    return this.data.memberIds.includes(id);
  }

  /** canJoin reports whether the platform accepts the account in a role. */
  protected canJoin(account: PlatformUser): boolean {
    return account.userType !== 'owner' && account.status === 'active';
  }

  /** refusal is the reason why the account cannot join the role. */
  protected refusal(account: PlatformUser): string | null {
    if (account.userType === 'owner') {
      return 'El propietario de la plataforma no puede pertenecer a un rol.';
    }
    if (account.status !== 'active') {
      return 'La cuenta todavía no aceptó su invitación.';
    }
    return null;
  }

  /** fullName is the name that the worker reads for the account. */
  protected fullName(account: PlatformUser): string {
    return account.fullName;
  }

  /** add assigns the chosen accounts to the role. */
  protected async add(): Promise<void> {
    if (this.submitting() || this.selected().length === 0) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      for (const id of this.selected()) {
        await this.assignMember.execute({ userId: id, groupId: this.data.groupId });
      }
      this.dialogRef.close(true);
    } catch (error) {
      this.errorMessage.set(describeMembershipFailure(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /** cancel closes the dialog without adding anybody. */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  private async load(): Promise<void> {
    const term = this.searchTerm().trim();
    if (term.length > 0 && [...term].length < MIN_SEARCH_LENGTH) {
      this.accounts.set([]);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const result = await this.listUsers.execute({
        ...(term ? { search: term } : {}),
        limit: ACCOUNTS_PAGE,
        page: 1,
      });
      this.accounts.set(result.items);
    } catch (error) {
      this.accounts.set([]);
      this.errorMessage.set(describeMembershipFailure(error));
    } finally {
      this.loading.set(false);
    }
  }
}
