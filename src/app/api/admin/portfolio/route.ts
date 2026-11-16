import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  PICTURES_BUCKET,
  isSafeStoragePath,
  listPictureLibrary,
  listPortfolioImages,
  sanitizeUploadName,
} from '@/lib/portfolioImages';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function nextSortOrder() {
  const { data, error } = await supabaseAdmin
    .from('portfolio_images')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return (data?.[0]?.sort_order ?? 0) + 1;
}

async function addExistingImage(storagePath: string) {
  if (!isSafeStoragePath(storagePath)) {
    return NextResponse.json({ error: 'Ogiltig bildsökväg' }, { status: 400 });
  }

  const library = await listPictureLibrary();
  const exists = library.some((image) => image.storagePath === storagePath);
  if (!exists) {
    return NextResponse.json({ error: 'Bilden finns inte i bildarkivet' }, { status: 404 });
  }

  const sortOrder = await nextSortOrder();
  const { error } = await supabaseAdmin.from('portfolio_images').insert({
    storage_path: storagePath,
    sort_order: sortOrder,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Bilden finns redan i portfolion' }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ images: await listPortfolioImages() });
}

export async function GET() {
  try {
    const [images, library] = await Promise.all([
      listPortfolioImages(),
      listPictureLibrary(),
    ]);

    return NextResponse.json({ images, library });
  } catch (error) {
    console.error('Error loading admin portfolio:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta portfoliobilder' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      return await addExistingImage(String(body.storagePath || ''));
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Ingen bild vald' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Endast bildfiler är tillåtna' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Bilden är för stor. Max storlek är 10 MB.' }, { status: 400 });
    }

    const storagePath = sanitizeUploadName(file.name);
    if (!isSafeStoragePath(storagePath)) {
      return NextResponse.json({ error: 'Filnamnet är ogiltigt' }, { status: 400 });
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PICTURES_BUCKET)
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading portfolio image:', uploadError);
      return NextResponse.json(
        { error: `Kunde inte ladda upp bilden: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const sortOrder = await nextSortOrder();
    const { error: insertError } = await supabaseAdmin.from('portfolio_images').insert({
      storage_path: storagePath,
      sort_order: sortOrder,
    });

    if (insertError) {
      await supabaseAdmin.storage.from(PICTURES_BUCKET).remove([storagePath]);
      throw insertError;
    }

    return NextResponse.json({ images: await listPortfolioImages() });
  } catch (error) {
    console.error('Error adding portfolio image:', error);
    return NextResponse.json(
      { error: 'Kunde inte lägga till bilden' },
      { status: 500 }
    );
  }
}

const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const order = Array.isArray(body.order) ? body.order.map((id: unknown) => String(id)) : [];

    if (order.length === 0 || order.some((id: string) => !IMAGE_ID.test(id))) {
      return NextResponse.json({ error: 'Ogiltig bildordning' }, { status: 400 });
    }

    const updates = order.map((id: string, index: number) =>
      supabaseAdmin
        .from('portfolio_images')
        .update({ sort_order: index + 1 })
        .eq('id', id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      throw failed.error;
    }

    return NextResponse.json({ images: await listPortfolioImages() });
  } catch (error) {
    console.error('Error reordering portfolio images:', error);
    return NextResponse.json(
      { error: 'Kunde inte spara bildordningen' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    if (!id) {
      return NextResponse.json({ error: 'Bild-id saknas' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('portfolio_images')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ images: await listPortfolioImages() });
  } catch (error) {
    console.error('Error removing portfolio image:', error);
    return NextResponse.json(
      { error: 'Kunde inte ta bort bilden från portfolion' },
      { status: 500 }
    );
  }
}
