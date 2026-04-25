import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminService } from '../services/admin.service';
import { User } from '../../../shared/models/user.model';
import { MessagesService } from '../../../core/services/messages.service';
import { asPaged } from '../utils/paginated-response.util';

@Component({
  standalone: true,
  selector: 'app-users-management',
  imports: [MatTableModule, MatButtonModule, MatPaginatorModule],
  template: `
    <header class="app-page-head">
      <h1 class="app-page-title">Usuarios</h1>
      <p class="app-page-sub">Listado y estado de cuentas.</p>
    </header>
    <div class="app-data-block">
      <div class="app-table-wrap">
        <table mat-table [dataSource]="rows()" class="full">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let u">{{ u.id }}</td>
          </ng-container>
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>Usuario</th>
            <td mat-cell *matCellDef="let u">{{ u.username }}</td>
          </ng-container>
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Rol</th>
            <td mat-cell *matCellDef="let u">{{ roleLabel(u.role) }}</td>
          </ng-container>
          <ng-container matColumnDef="mail">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let u">{{ u.email }}</td>
          </ng-container>
          <ng-container matColumnDef="act">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let u">
              <button mat-button (click)="toggle(u)">Activar / desactivar</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </div>
      <mat-paginator
        class="app-paginator"
        [length]="total()"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex"
        (page)="page($event)"
      />
    </div>
  `,
  styles: `
    .full { width: 100%; }
  `,
})
export class UsersManagementPage implements OnInit {
  private readonly api = inject(AdminService);
  private readonly messages = inject(MessagesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly rows = signal<User[]>([]);
  readonly total = signal(0);
  pageSize = 20;
  pageIndex = 0;
  cols = ['id', 'user', 'role', 'mail', 'act'];

  /** Etiquetas alineadas con apps.users.models.Role (backend). */
  roleLabel(role: string | undefined): string {
    const map: Record<string, string> = {
      admin: 'Administrador',
      workshop_owner: 'Dueño de taller',
      client: 'Cliente',
      technician: 'Técnico',
    };
    return role && map[role] ? map[role] : role ?? '—';
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  load() {
    this.api.getUsers({ page: String(this.pageIndex + 1) }).subscribe((res) => {
      const { results, count } = asPaged<User>(res);
      this.rows.set(results);
      this.total.set(count);
    });
  }

  page(ev: PageEvent) {
    this.pageIndex = ev.pageIndex;
    this.pageSize = ev.pageSize;
    this.load();
  }

  toggle(u: User) {
    this.api.toggleUserActive(u.id).subscribe(() => {
      this.messages.success('Estado del usuario actualizado');
      this.load();
    });
  }
}
