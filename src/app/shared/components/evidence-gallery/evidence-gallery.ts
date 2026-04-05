import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgImageSliderModule } from 'ng-image-slider';
import { Evidence } from '../../models/incident.model';
import { mediaUrl } from '../../../core/utils/media-url';

@Component({
  selector: 'app-evidence-gallery',
  standalone: true,
  imports: [NgImageSliderModule],
  template: `
    @if (imageObjects.length) {
      <ng-image-slider
        [images]="imageObjects"
        [infinite]="false"
        [autoSlide]="0"
        [imageSize]="{ width: '100%', height: '220px' }"
      />
    }
    @for (ev of audioEvidences; track ev.id) {
      <div class="aud">
        <span>{{ ev.label || 'Audio' }}</span>
        <audio controls [src]="mediaUrl(ev.file)"></audio>
        @if (ev.transcription) {
          <p class="tx">{{ ev.transcription }}</p>
        }
      </div>
    }
  `,
  styles: `
    .aud {
      margin-top: 12px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .tx {
      font-size: 13px;
      margin-top: 6px;
    }
  `,
})
export class EvidenceGalleryComponent implements OnChanges {
  @Input() evidences: Evidence[] | null | undefined = [];

  imageObjects: { image: string; thumbImage: string; title: string }[] = [];
  audioEvidences: Evidence[] = [];

  ngOnChanges(_: SimpleChanges) {
    const list = this.evidences ?? [];
    this.imageObjects = list
      .filter((e) => e.evidence_type === 'image')
      .map((e) => ({
        image: mediaUrl(e.file),
        thumbImage: mediaUrl(e.file),
        title: e.label || 'Imagen',
      }));
    this.audioEvidences = list.filter((e) => e.evidence_type === 'audio');
  }

  protected readonly mediaUrl = mediaUrl;
}
