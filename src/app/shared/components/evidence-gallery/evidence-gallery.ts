import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { register } from 'swiper/element/bundle';
import { Evidence } from '../../models/incident.model';
import { mediaUrl } from '../../../core/utils/media-url';

register();

@Component({
  selector: 'app-evidence-gallery',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (imageSlides.length === 1) {
      <figure class="slide-figure single">
        <img
          [src]="imageSlides[0].url"
          [alt]="imageSlides[0].label"
          loading="lazy"
          decoding="async"
        />
        @if (imageSlides[0].label) {
          <figcaption>{{ imageSlides[0].label }}</figcaption>
        }
      </figure>
    } @else if (imageSlides.length > 1) {
      <swiper-container class="evidence-swiper" pagination="true" navigation="true" slides-per-view="1" space-between="0">
        @for (slide of imageSlides; track slide.id) {
          <swiper-slide>
            <figure class="slide-figure">
              <img [src]="slide.url" [alt]="slide.label" loading="lazy" decoding="async" />
              @if (slide.label) {
                <figcaption>{{ slide.label }}</figcaption>
              }
            </figure>
          </swiper-slide>
        }
      </swiper-container>
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
    .evidence-swiper {
      display: block;
      width: 100%;
      height: 220px;
      --swiper-navigation-size: 28px;
      --swiper-navigation-sides-offset: 6px;
      --swiper-pagination-bullet-size: 6px;
    }
    .slide-figure.single {
      margin: 0;
      min-height: 180px;
    }
    .slide-figure {
      margin: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .slide-figure img {
      width: 100%;
      height: 100%;
      max-height: 220px;
      object-fit: contain;
      display: block;
    }
    .slide-figure figcaption {
      font-size: 12px;
      color: #555;
      padding: 6px 8px 8px;
      text-align: center;
      width: 100%;
      box-sizing: border-box;
    }
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

  imageSlides: { id: number; url: string; label: string }[] = [];
  audioEvidences: Evidence[] = [];

  ngOnChanges(_: SimpleChanges) {
    const list = this.evidences ?? [];
    this.imageSlides = list
      .filter((e) => e.evidence_type === 'image')
      .map((e) => ({
        id: e.id,
        url: mediaUrl(e.file),
        label: (e.label || 'Imagen').trim(),
      }));
    this.audioEvidences = list.filter((e) => e.evidence_type === 'audio');
  }

  protected readonly mediaUrl = mediaUrl;
}
