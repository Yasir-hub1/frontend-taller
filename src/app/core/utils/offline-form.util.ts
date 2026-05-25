/** Logo serializado para guardar en cola offline (base64). */
export interface StoredLogoFile {
  name: string;
  type: string;
  dataUrl: string;
}

export interface WorkshopFormPayload {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  radius_km: string;
  services: string;
  logo?: StoredLogoFile;
}

export function readFileAsStoredLogo(file: File): Promise<StoredLogoFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ name: file.name, type: file.type || 'image/jpeg', dataUrl: reader.result as string });
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el logo'));
    reader.readAsDataURL(file);
  });
}

export function storedLogoToBlob(stored: StoredLogoFile): Blob {
  const base64 = stored.dataUrl.includes(',') ? stored.dataUrl.split(',')[1] : stored.dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: stored.type || 'image/jpeg' });
}

export function buildWorkshopFormData(payload: WorkshopFormPayload): FormData {
  const fd = new FormData();
  fd.append('name', payload.name);
  fd.append('description', payload.description);
  fd.append('address', payload.address);
  fd.append('latitude', payload.latitude);
  fd.append('longitude', payload.longitude);
  fd.append('phone', payload.phone);
  fd.append('email', payload.email);
  fd.append('radius_km', payload.radius_km);
  fd.append('services', payload.services);
  if (payload.logo) {
    fd.append('logo', storedLogoToBlob(payload.logo), payload.logo.name);
  }
  return fd;
}

export async function formDataToWorkshopPayload(
  fd: FormData,
  logoFile?: File | null,
): Promise<WorkshopFormPayload> {
  const payload: WorkshopFormPayload = {
    name: String(fd.get('name') ?? ''),
    description: String(fd.get('description') ?? ''),
    address: String(fd.get('address') ?? ''),
    latitude: String(fd.get('latitude') ?? ''),
    longitude: String(fd.get('longitude') ?? ''),
    phone: String(fd.get('phone') ?? ''),
    email: String(fd.get('email') ?? ''),
    radius_km: String(fd.get('radius_km') ?? ''),
    services: String(fd.get('services') ?? '[]'),
  };
  if (logoFile) {
    payload.logo = await readFileAsStoredLogo(logoFile);
  }
  return payload;
}
