import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const PICTURES_BUCKET = 'pictures';

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|svg)$/i;

export type PortfolioImage = {
  id: string;
  storagePath: string;
  url: string;
  caption: string;
  sortOrder: number;
};

export type LibraryImage = {
  storagePath: string;
  url: string;
};

type PortfolioRow = {
  id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
};

export function isSafeStoragePath(path: string) {
  if (!path || path.length > 300) return false;
  if (path.includes('/') || path.includes('\\') || path.includes('..')) return false;
  return IMAGE_EXTENSION.test(path);
}

export function portfolioImageUrl(storagePath: string) {
  return `/api/storage/pictures/proxy/${encodeURIComponent(storagePath)}`;
}

function toPortfolioImage(row: PortfolioRow): PortfolioImage {
  return {
    id: row.id,
    storagePath: row.storage_path,
    url: portfolioImageUrl(row.storage_path),
    caption: row.caption?.trim() || 'Studio Clay',
    sortOrder: row.sort_order,
  };
}

export async function listPortfolioImages() {
  const { data, error } = await supabaseAdmin
    .from('portfolio_images')
    .select('id, storage_path, caption, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PortfolioRow[]).map(toPortfolioImage);
}

export async function listPictureLibrary(): Promise<LibraryImage[]> {
  const files: string[] = [];
  const pageSize = 100;

  for (let offset = 0; offset < 2000; offset += pageSize) {
    const { data, error } = await supabaseAdmin.storage.from(PICTURES_BUCKET).list('', {
      limit: pageSize,
      offset,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      throw error;
    }

    if (!data?.length) break;

    for (const file of data) {
      if (file.id && isSafeStoragePath(file.name)) {
        files.push(file.name);
      }
    }

    if (data.length < pageSize) break;
  }

  return files.map((storagePath) => ({
    storagePath,
    url: portfolioImageUrl(storagePath),
  }));
}

export function sanitizeUploadName(fileName: string) {
  const baseName = fileName.split(/[/\\]/).pop() || 'image';
  const cleaned = baseName.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-');
  return `${Date.now()}-${cleaned}`;
}
