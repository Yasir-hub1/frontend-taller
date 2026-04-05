import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { AdminService } from '../services/admin.service';
import { Incident } from '../../../shared/models/incident.model';
import { AiSummaryCardComponent } from '../../../shared/components/ai-summary-card/ai-summary-card';
import { EvidenceGalleryComponent } from '../../../shared/components/evidence-gallery/evidence-gallery';
import { IncidentWebService } from '../../workshop-owner/services/incident-web.service';

@Component({
  standalone: true,
  selector: 'app-admin-incident-detail',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent, AiSummaryCardComponent, EvidenceGalleryComponent],
  template: `
    @if (inc()) {
      <header class="app-page-head">
        <h1 class="app-page-title">Incidente #{{ inc()!.id }}</h1>
        <p class="app-page-sub">Vista administración · {{ inc()!.status }} · {{ inc()!.incident_type }}</p>
      </header>
      <mat-card class="mt app-surface-card">
        <mat-card-content>
          <p class="muted">{{ inc()!.address_text }}</p>
          <p class="desc">{{ inc()!.description }}</p>
        </mat-card-content>
      </mat-card>
      <app-ai-summary-card
        [summary]="ai()"
        [confidence]="inc()!.ai_confidence"
      />
      <mat-card class="mt app-surface-card">
        <mat-card-header><mat-card-title>Evidencias</mat-card-title></mat-card-header>
        <mat-card-content>
          <app-evidence-gallery [evidences]="inc()!.evidences" />
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .mt { margin-top: 1rem; }
    .muted {
      color: var(--app-text-muted, #64748b);
      font-size: 0.875rem;
      margin: 0 0 0.75rem;
    }
    .desc { margin: 0; line-height: 1.55; }
  `,
})
export class AdminIncidentDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminService);
  private readonly parse = inject(IncidentWebService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly inc = signal<Incident | null>(null);
  readonly ai = signal(this.parse.parseAISummary(null));

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) this.fetch();
  }

  private fetch() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getIncident(id).subscribe((data) => {
      this.inc.set(data);
      this.ai.set(data.ai_summary_parsed ?? this.parse.parseAISummary(data.ai_summary ?? null));
    });
  }
}
