'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SectionContainer from '../Dashboard/SectionContainer';
import ConfirmDialog from '../common/ConfirmDialog';
import courseStyles from '../../../app/admin/dashboard/courses/courses.module.css';
import styles from './portfolio.module.css';

type PortfolioImage = {
  id: string;
  storagePath: string;
  url: string;
  caption: string;
  sortOrder: number;
};

type LibraryImage = {
  storagePath: string;
  url: string;
};

export default function PortfolioManager() {
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [search, setSearch] = useState('');
  const [imageToRemove, setImageToRemove] = useState<PortfolioImage | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/portfolio');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta portfolion');
      }
      setImages(Array.isArray(data.images) ? data.images : []);
      setLibrary(Array.isArray(data.library) ? data.library : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta portfolion');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const selectedPaths = useMemo(
    () => new Set(images.map((image) => image.storagePath)),
    [images]
  );

  const filteredLibrary = useMemo(() => {
    const query = search.trim().toLowerCase();
    return library.filter((image) => {
      if (selectedPaths.has(image.storagePath)) return false;
      return !query || image.storagePath.toLowerCase().includes(query);
    });
  }, [library, search, selectedPaths]);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/admin/portfolio', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Kunde inte ladda upp ${file.name}`);
        }
        if (Array.isArray(data.images)) {
          setImages(data.images);
        }
      }
      await loadPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uppladdningen misslyckades');
    } finally {
      setUploading(false);
    }
  }

  async function addFromLibrary(storagePath: string) {
    setError(null);
    try {
      const response = await fetch('/api/admin/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte lägga till bilden');
      }
      if (Array.isArray(data.images)) {
        setImages(data.images);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte lägga till bilden');
    }
  }

  async function saveCaption(image: PortfolioImage, caption: string) {
    if (caption.trim() === image.caption) return;
    try {
      const response = await fetch('/api/admin/portfolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: image.id, caption }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte spara bildtexten');
      }
      if (Array.isArray(data.images)) {
        setImages(data.images);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara bildtexten');
    }
  }

  async function removeImage() {
    if (!imageToRemove) return;
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/portfolio?id=${encodeURIComponent(imageToRemove.id)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte ta bort bilden');
      }
      if (Array.isArray(data.images)) {
        setImages(data.images);
      }
      setImageToRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort bilden');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <p className={styles.intro}>
        Bilderna sparas i Supabase-bucketen <strong>pictures</strong>. Nya uppladdningar och bilder du väljer från bildarkivet visas på sajtens portfolio. Samma bucket används även av kurser och webshop, så en bild som tas bort här ligger kvar i arkivet.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.toolbar}>
        <label className={courseStyles.addButton}>
          {uploading ? 'Laddar upp...' : 'Lägg till bilder'}
          <input
            className={styles.fileInput}
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(event) => {
              uploadFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          className={styles.libraryButton}
          onClick={() => setShowLibrary((open) => !open)}
        >
          {showLibrary ? 'Dölj bildarkiv' : 'Välj från bildarkivet'}
        </button>
      </div>

      {showLibrary && (
        <SectionContainer title="Bildarkiv" count={filteredLibrary.length}>
          <div className={styles.toolbar}>
            <input
              className={styles.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sök filnamn"
            />
          </div>
          {filteredLibrary.length === 0 ? (
            <p className={styles.status}>Inga fler bilder att lägga till.</p>
          ) : (
            <div className={styles.libraryGrid}>
              {filteredLibrary.map((image) => (
                <button
                  key={image.storagePath}
                  type="button"
                  className={styles.libraryCard}
                  onClick={() => addFromLibrary(image.storagePath)}
                  title={image.storagePath}
                >
                  <img className={styles.thumb} src={image.url} alt="" />
                  <span className={styles.libraryName}>{image.storagePath}</span>
                </button>
              ))}
            </div>
          )}
        </SectionContainer>
      )}

      <SectionContainer title="Portfolio" count={images.length}>
        {loading ? (
          <p className={styles.status}>Laddar bilder...</p>
        ) : images.length === 0 ? (
          <p className={styles.status}>Inga bilder i portfolion ännu.</p>
        ) : (
          <div className={styles.grid}>
            {images.map((image) => (
              <article key={image.id} className={styles.card}>
                <img className={styles.thumb} src={image.url} alt={image.caption} />
                <div className={styles.meta}>
                  <input
                    className={styles.captionInput}
                    defaultValue={image.caption}
                    aria-label="Bildtext"
                    onBlur={(event) => saveCaption(image, event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => setImageToRemove(image)}
                  >
                    Ta bort
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionContainer>

      <ConfirmDialog
        open={Boolean(imageToRemove)}
        title="Ta bort från portfolio"
        message="Bilden tas bort från portfolion men ligger kvar i bildarkivet, så kurser och produkter som använder den påverkas inte."
        confirmLabel="Ta bort"
        loading={removing}
        onConfirm={removeImage}
        onCancel={() => setImageToRemove(null)}
      />
    </>
  );
}
