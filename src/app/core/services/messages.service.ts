import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';
import { isQueuedResult } from '../models/offline.model';

const toastBase = {
  toast: true,
  position: 'top-end' as const,
  showConfirmButton: false,
  timer: 3800,
  timerProgressBar: true,
};

const FIELD_LABELS: Record<string, string> = {
  username: 'Usuario',
  password: 'Contraseña',
  password_confirm: 'Confirmar contraseña',
  email: 'Email',
  first_name: 'Nombre',
  last_name: 'Apellido',
  phone: 'Teléfono',
  national_id: 'Documento de identidad',
  name: 'Nombre',
  description: 'Descripción',
  address: 'Dirección',
  latitude: 'Latitud',
  longitude: 'Longitud',
  radius_km: 'Radio (km)',
  services: 'Servicios',
  technician_id: 'Técnico',
  eta: 'ETA (minutos)',
  service_cost: 'Costo del servicio',
  notes: 'Notas',
  reason: 'Motivo',
  percentage: 'Porcentaje',
  effective_from: 'Vigencia desde',
  specialties: 'Especialidades',
};

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private readonly platformId = inject(PLATFORM_ID);

  private inBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  success(text: string): void {
    if (!this.inBrowser()) return;
    void Swal.fire({ ...toastBase, icon: 'success', title: text });
  }

  error(text: string): void {
    if (!this.inBrowser()) return;
    void Swal.fire({ ...toastBase, icon: 'error', title: text });
  }

  warning(text: string): void {
    if (!this.inBrowser()) return;
    void Swal.fire({ ...toastBase, icon: 'warning', title: text });
  }

  info(text: string): void {
    if (!this.inBrowser()) return;
    void Swal.fire({ ...toastBase, icon: 'info', title: text });
  }

  /** Toast visible para alertas en tiempo real (SSE / push). */
  notify(title: string, detail?: string): void {
    if (!this.inBrowser()) return;
    const fullTitle = detail ? `${title}` : title;
    const html = detail
      ? `<p style="margin:0.35rem 0 0;font-size:0.875rem;font-weight:500;text-align:left;">${this.escapeHtml(detail)}</p>`
      : undefined;
    void Swal.fire({
      ...toastBase,
      icon: 'info',
      title: fullTitle,
      html,
      timer: 5500,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      customClass: {
        popup: 'app-notif-toast',
        title: 'app-notif-toast-title',
      },
      didOpen: (toast) => {
        toast.style.zIndex = '1300';
      },
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Texto legible a partir de cuerpos típicos de Django REST / JSON. */
  parseHttpErrorPayload(err: { error?: unknown; status?: number; message?: string }): string {
    const body = err?.error;
    if (body == null || body === '') {
      if (err.status === 0) {
        return 'No hay conexión con el servidor. Comprueba tu red.';
      }
      return err?.message || 'Ha ocurrido un error';
    }
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') {
          return this.formatErrorBody(parsed);
        }
      } catch {
        return body;
      }
    }
    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
      return this.formatErrorBody(body as Record<string, unknown>);
    }
    return String(body);
  }

  private formatErrorBody(body: Record<string, unknown>): string {
    const parts: string[] = [];

    const pushDetail = (d: unknown) => {
      if (typeof d === 'string' && d) parts.push(d);
      else if (Array.isArray(d)) d.forEach((x) => parts.push(String(x)));
    };

    pushDetail(body['detail']);
    if (typeof body['message'] === 'string') parts.push(body['message']);
    if (typeof body['error'] === 'string') parts.push(body['error']);
    pushDetail(body['non_field_errors']);

    for (const [key, val] of Object.entries(body)) {
      if (['detail', 'message', 'error', 'non_field_errors'].includes(key)) continue;
      const label = FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
      if (Array.isArray(val)) {
        val.forEach((v) => parts.push(`${label}: ${String(v)}`));
      } else if (typeof val === 'string' && val) {
        parts.push(`${label}: ${val}`);
      } else if (val !== null && typeof val === 'object') {
        parts.push(`${label}: ${JSON.stringify(val)}`);
      }
    }

    const s = parts.filter(Boolean).join('\n').trim();
    return s || 'Ha ocurrido un error';
  }

  /**
   * Si el control es inválido, marca touched y muestra aviso. Devuelve true si hubo que avisar.
   */
  showFormValidationWarning(
    control: AbstractControl,
    generic = 'Revisá los campos obligatorios o con formato incorrecto.',
  ): boolean {
    if (control.valid) return false;
    control.markAllAsTouched();
    const lines = this.collectControlErrors(control);
    this.warning(lines.length ? lines.join('\n') : generic);
    return true;
  }

  private fieldLabel(key: string): string {
    return FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
  }

  private collectControlErrors(control: AbstractControl, path = ''): string[] {
    const out: string[] = [];
    if (control instanceof FormGroup) {
      for (const [k, c] of Object.entries(control.controls)) {
        const p = path ? `${path} › ${this.fieldLabel(k)}` : this.fieldLabel(k);
        out.push(...this.collectControlErrors(c, p));
      }
      return out;
    }
    if (control instanceof FormArray) {
      control.controls.forEach((c, i) => {
        out.push(...this.collectControlErrors(c, `${path} (${i + 1})`));
      });
      return out;
    }
    if (
      !(control instanceof FormGroup) &&
      !(control instanceof FormArray) &&
      control.invalid &&
      control.errors
    ) {
      const label = path || 'Campo';
      const e = control.errors;
      if (e['required']) out.push(`${label}: obligatorio`);
      else if (e['email']) out.push(`${label}: email no válido`);
      else if (e['minlength'])
        out.push(`${label}: mínimo ${e['minlength'].requiredLength} caracteres`);
      else if (e['maxlength'])
        out.push(`${label}: máximo ${e['maxlength'].requiredLength} caracteres`);
      else if (e['min'] !== undefined) out.push(`${label}: valor demasiado bajo`);
      else if (e['max'] !== undefined) out.push(`${label}: valor demasiado alto`);
      else out.push(`${label}: no válido`);
    }
    return out;
  }

  /** Mensaje de éxito según si la acción quedó en cola offline o se aplicó al instante. */
  mutationSuccess(result: unknown, onlineMessage: string): void {
    if (isQueuedResult(result)) {
      this.success('Sin conexión: acción guardada. Se enviará al recuperar internet.');
      return;
    }
    this.success(onlineMessage);
  }
}
