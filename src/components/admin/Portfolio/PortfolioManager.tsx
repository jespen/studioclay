'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
  const draggingIdRef = useRef<string | null>(null);

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

  async function moveImage(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return;

    const next = [...images];
    const fromIndex = next.findIndex((image) => image.id === sourceId);
    const toIndex = next.findIndex((image) => image.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setImages(next);
    setError(null);

    try {
      const response = await fetch('/api/admin/portfolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: next.map((image) => image.id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte spara bildordningen');
      }
      if (Array.isArray(data.images)) {
        setImages(data.images);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara bildordningen');
      await loadPortfolio();
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
          <>
            <p className={styles.orderHint}>Dra i handtaget för att ändra ordningen på sajten.</p>
            <div className={styles.grid}>
              {images.map((image) => (
                <article
                  key={image.id}
                  className={styles.card}
                  onDragOver={(event) => {
                    event.preventDefault();
                    const sourceId = draggingIdRef.current;
                    if (!sourceId || sourceId === image.id) return;
                    event.currentTarget.parentElement
                      ?.querySelectorAll(`.${styles.dragOver}`)
                      .forEach((node) => node.classList.remove(styles.dragOver));
                    event.currentTarget.classList.add(styles.dragOver);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = draggingIdRef.current;
                    event.currentTarget.parentElement
                      ?.querySelectorAll(`.${styles.dragging}, .${styles.dragOver}`)
                      .forEach((node) => node.classList.remove(styles.dragging, styles.dragOver));
                    draggingIdRef.current = null;
                    if (sourceId && sourceId !== image.id) {
                      moveImage(sourceId, image.id);
                    }
                  }}
                >
                  <img className={styles.thumb} src={image.url} alt="" draggable={false} />
                  <div className={styles.actions}>
                    <div
                      className={`${styles.iconButton} ${styles.dragHandle}`}
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label="Flytta bild"
                      title="Dra för att flytta"
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', image.id);
                        draggingIdRef.current = image.id;
                        event.currentTarget.closest('article')?.classList.add(styles.dragging);
                      }}
                      onDragEnd={(event) => {
                        draggingIdRef.current = null;
                        event.currentTarget.closest(`.${styles.grid}`)
                          ?.querySelectorAll(`.${styles.dragging}, .${styles.dragOver}`)
                          .forEach((node) => node.classList.remove(styles.dragging, styles.dragOver));
                      }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </div>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.deleteButton}`}
                      aria-label="Ta bort"
                      title="Ta bort"
                      onClick={() => setImageToRemove(image)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
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
