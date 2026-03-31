'use client';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/atoms/Button/Button';
import { ShaderEditor, DEFAULT_SHADER } from '@/components/organisms/ShaderEditor/ShaderEditor';
import { Footer } from '@/components/organisms/Footer/Footer';
import {
  createPost, updatePost, updateUserProfile, createEvent, updateEvent, createShader, updateShader, getTags, deletePost, deleteEvent
} from '@/actions/data';
import { logout } from '@/actions/auth';
import { generateSlug } from '@/utils/generateSlug';
import type { User, Post, Event, Tag, Shader } from '@/types';
import { useProfileStore } from '@/store/profile';
import { useSavedStore } from '@/store/saved';
import { DashboardPostsList } from './DashboardPostsList';
import styles from './DashboardTemplate.module.scss';

const ShaderCanvas = dynamic(() => import('@/components/organisms/ShaderCanvas/ShaderCanvas'), { ssr: false });

interface DashboardTemplateProps {
  user: User;
  userPosts?: Post[];
  editPost?: Post | null;
  editShader?: Shader | null;
  editEvent?: Event | null;
  editPrevPost?: Post | null;
  editNextPost?: Post | null;
  editPrevEvent?: Event | null;
  editNextEvent?: Event | null;
}

type DashTab = 'perfil' | 'nuevo-poema' | 'nuevo-evento';

function timestampToDateString(ts: any): string {
  if (!ts) return '';
  const secs = typeof ts?.seconds === 'number' ? ts.seconds : 0;
  if (!secs) return '';
  const d = new Date(secs * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DashboardTemplate({ user, userPosts = [], editPost, editShader, editEvent, editPrevPost, editNextPost, editPrevEvent, editNextEvent }: DashboardTemplateProps) {
  const [activeTab, setActiveTab] = useState<DashTab>(() => {
    if (editPost) return 'nuevo-poema';
    if (editEvent) return 'nuevo-evento';
    return 'perfil';
  });
  const name = user.username || user.email.split('@')[0];

  // Profile state
  const [bio, setBio] = useState(user.bio || '');
  const [username, setUsername] = useState(user.username || '');
  const [contacts, setContacts] = useState(user.contacts || []);
  const [profileTags, setProfileTags] = useState<string[]>(user.tagIds || []);
  const { setProfile } = useProfileStore();

  // Sync live username typing to the profile store → updates the header in real time
  useEffect(() => {
    setProfile({ username });
  }, [username, setProfile]);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Tags state
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    async function loadTags() {
      setTagsLoading(true);
      try {
        const tags = await getTags(100);
        setAvailableTags(tags);
      } catch (e) {
        console.error('Failed to load tags', e);
      } finally {
        setTagsLoading(false);
      }
    }
    loadTags();
  }, []);

  // Post state — pre-fill from editPost if provided
  const [editingPostId, setEditingPostId] = useState<string | null>(editPost?.id || null);
  const [postTitle, setPostTitle] = useState(editPost?.title || '');
  const [postContent, setPostContent] = useState(editPost?.content || '');
  const [postSlug, setPostSlug] = useState(editPost?.slug || '');
  const [postTags, setPostTags] = useState<string[]>(editPost?.tagIds ?? []);

  // Sync postTags when editing a different post (safety net)
  useEffect(() => {
    setPostTags(editPost?.tagIds ?? []);
  }, [editPost?.id]);
  const [postVisible, setPostVisible] = useState(editPost ? (editPost as any).isVisible !== false : true);
  const [postIndexed, setPostIndexed] = useState(editPost ? (editPost as any).isIndexed !== false : true);
  // editingShaderId tracks the existing shader to update when editing a post
  const [editingShaderId, setEditingShaderId] = useState<string | null>((editPost as any)?.shaderId || null);
  const [postShaderCode, setPostShaderCode] = useState(editShader?.glslCode || '');
  const [shaderPreviewCode, setShaderPreviewCode] = useState(editShader?.glslCode || DEFAULT_SHADER);
  const [showShaderEditor, setShowShaderEditor] = useState(false);
  const [postMsg, setPostMsg] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [deletePostConfirm, setDeletePostConfirm] = useState(false);
  const [savedPostSlug, setSavedPostSlug] = useState<string | null>(editPost?.slug || null);

  // Event state — pre-fill from editEvent if provided
  const [editingEventId, setEditingEventId] = useState<string | null>(editEvent?.id || null);
  const [eventTitle, setEventTitle] = useState(editEvent?.title || '');
  const [eventDesc, setEventDesc] = useState(editEvent?.description || '');
  const [eventDay, setEventDay] = useState(editEvent ? timestampToDateString(editEvent.day) : '');
  const [eventHour, setEventHour] = useState(editEvent?.hour || '');
  const [eventPlace, setEventPlace] = useState(editEvent?.place || '');
  const [eventPrice, setEventPrice] = useState(editEvent?.price !== undefined ? String(editEvent.price) : '');
  const [eventTags, setEventTags] = useState<string[]>(editEvent?.tagIds ?? []);
  const [eventMsg, setEventMsg] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deleteEventConfirm, setDeleteEventConfirm] = useState(false);

  // Sync eventTags when editing a different event (safety net)
  useEffect(() => {
    setEventTags(editEvent?.tagIds ?? []);
  }, [editEvent?.id]);

  const handleProfileSave = useCallback(async () => {
    setProfileLoading(true);
    const result = await updateUserProfile(user.id, { bio, username, contacts, tagIds: profileTags });
    setProfileMsg(result.success ? 'Perfil actualizado.' : (result.error || 'Error.'));
    setProfileLoading(false);
  }, [user.id, bio, username, contacts, profileTags]);

  const handleDeletePost = async () => {
    if (!editingPostId) return;
    setIsDeletingPost(true);
    const result = await deletePost(user.id, editingPostId);
    if (result.success) {
      window.location.href = `/u/${encodeURIComponent(user.id)}`;
    } else {
      setPostMsg(result.error || 'Error al eliminar poema.');
      setIsDeletingPost(false);
      setDeletePostConfirm(false);
    }
  };

  const handlePostSave = useCallback(async () => {
    if (!postTitle || !postContent) {
      setPostMsg('Título y contenido son obligatorios.');
      return;
    }
    setPostLoading(true);

    if (editingPostId) {
      // Update existing post — also handle shader save/update
      const slug = postSlug || generateSlug(postTitle);

      let shaderId: string | undefined = editingShaderId || undefined;

      if (postShaderCode) {
        if (editingShaderId) {
          // Update existing shader
          await updateShader(user.id, editingShaderId, { glslCode: postShaderCode, name: postTitle });
        } else {
          // Create a new shader for this post
          const shaderResult = await createShader(user.id, {
            name: postTitle,
            glslCode: postShaderCode,
            isPublic: false,
          });
          if (shaderResult.success) {
            shaderId = shaderResult.id;
            setEditingShaderId(shaderResult.id || null);
          }
        }
      }

      const result = await updatePost(user.id, editingPostId, {
        title: postTitle,
        content: postContent,
        slug,
        tagIds: postTags,
        shaderId,
        isVisible: postVisible,
        isIndexed: postIndexed,
      });
      if (result.success) {
        setSavedPostSlug(editPost?.slug || slug);
        setPostMsg('Poema actualizado.');
      } else {
        setPostMsg(result.error || 'Error.');
      }
    } else {
      // Create new post
      const slug = postSlug || generateSlug(postTitle);

      let shaderId: string | undefined;
      if (postShaderCode) {
        const shaderResult = await createShader(user.id, {
          name: postTitle,
          glslCode: postShaderCode,
          isPublic: false,
        });
        if (shaderResult.success) shaderId = shaderResult.id;
      }

      const result = await createPost(user.id, {
        title: postTitle,
        content: postContent,
        slug,
        tagIds: postTags,
        shaderId,
        isVisible: postVisible,
        isIndexed: postIndexed,
      });

      if (result.success) {
        setSavedPostSlug(result.slug ?? null);
        setPostMsg('Poema publicado.');
        setPostTitle('');
        setPostContent('');
        setPostSlug('');
        setPostTags([]);
        setPostShaderCode('');
        setEditingPostId(null);
      } else {
        setPostMsg(result.error || 'Error.');
      }
    }
    setPostLoading(false);
  }, [user.id, editingPostId, editingShaderId, postTitle, postContent, postSlug, postTags, postVisible, postIndexed, postShaderCode]);

  const handleDeleteEvent = async () => {
    if (!editingEventId) return;
    setIsDeletingEvent(true);
    const result = await deleteEvent(user.id, editingEventId);
    if (result.success) {
      window.location.href = `/u/${encodeURIComponent(user.id)}`;
    } else {
      setEventMsg(result.error || 'Error al eliminar evento.');
      setIsDeletingEvent(false);
      setDeleteEventConfirm(false);
    }
  };

  const handleEventSave = useCallback(async () => {
    if (!eventTitle || !eventDay || !eventHour || !eventPlace) {
      setEventMsg('Título, día, hora y lugar son obligatorios.');
      return;
    }
    setEventLoading(true);

    if (editingEventId) {
      // Update existing event
      const result = await updateEvent(user.id, editingEventId, {
        title: eventTitle,
        description: eventDesc,
        day: new Date(eventDay),
        hour: eventHour,
        place: eventPlace,
        price: eventPrice !== '' ? parseFloat(eventPrice) : undefined,
        tagIds: eventTags,
      });
      setEventMsg(result.success ? 'Evento actualizado.' : (result.error || 'Error.'));
    } else {
      // Create new event
      const result = await createEvent(user.id, {
        title: eventTitle,
        description: eventDesc,
        day: new Date(eventDay),
        hour: eventHour,
        place: eventPlace,
        price: eventPrice !== '' ? parseFloat(eventPrice) : undefined,
        urls: [],
        contacts: [],
        tagIds: eventTags,
      });
      setEventMsg(result.success ? 'Evento creado.' : (result.error || 'Error.'));
      if (result.success) {
        setEventTitle('');
        setEventDesc('');
        setEventDay('');
        setEventHour('');
        setEventPlace('');
        setEventPrice('');
        setEventTags([]);
        setEditingEventId(null);
      }
    }
    setEventLoading(false);
  }, [user.id, editingEventId, eventTitle, eventDesc, eventDay, eventHour, eventPlace, eventPrice, eventTags]);

  const handleLogout = async () => {
    await logout();
    setProfile({ isLoggedIn: false, userId: '', email: '', username: '' });
    useSavedStore.getState().clearAll();
    window.location.href = '/';
  };

  return (
    <>
      {/* Live shader preview as full-page background when editor is open */}
      {showShaderEditor && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.35, pointerEvents: 'none' }}>
            <ShaderCanvas glslCode={shaderPreviewCode} />
          </div>
          {/* Backdrop blur overlay between shader and content */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1,
            backdropFilter: 'blur(48px) brightness(0.6)',
            WebkitBackdropFilter: 'blur(48px) brightness(0.6)',
            pointerEvents: 'none',
          }} />
        </>
      )}
      <div className={styles.page} style={{ position: 'relative', zIndex: 2, background: 'transparent' }}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <h1 className={styles.greeting}>Bienvenido, {name}</h1>
              <div className={styles.headerActions}>
                <Link href={`/u/${encodeURIComponent(user.id)}`} className={styles.profileLink}>
                  Ver perfil →
                </Link>
                <button className={styles.logoutBtn} onClick={handleLogout} aria-label="Cerrar sesión">
                  Salir
                </button>
              </div>
            </div>
            <nav className={styles.tabs} role="tablist">
              {(['perfil', 'nuevo-poema', 'nuevo-evento'] as DashTab[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'perfil'
                    ? 'Perfil'
                    : tab === 'nuevo-poema'
                      ? (editingPostId ? 'Editar poema' : 'Nuevo poema')
                      : (editingEventId ? 'Editar evento' : 'Nuevo evento')}
                </button>
              ))}
            </nav>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'perfil' && (
              <motion.div key="perfil" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={styles.panel}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="username">Nombre de usuario</label>
                  <input id="username" className={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu_nombre" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="bio">Biografía</label>
                  <textarea id="bio" className={styles.textarea} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Escribe algo sobre ti..." rows={4} />
                  <span className={styles.charCount}>{bio.length}/500</span>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Mis etiquetas (máx 10) — aparecen en "Poetas" del buscador</label>
                  <div className={styles.tagsContainer}>
                    {tagsLoading ? (
                      <p>Cargando etiquetas...</p>
                    ) : (
                      <div className={styles.tagList}>
                        {availableTags.map(tag => {
                          const isSelected = profileTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setProfileTags(prev => prev.filter(id => id !== tag.id));
                                } else if (profileTags.length < 10) {
                                  setProfileTags(prev => [...prev, tag.id]);
                                }
                              }}
                              className={`${styles.tagButton} ${isSelected ? styles.tagSelected : ''}`}
                              disabled={!isSelected && profileTags.length >= 10}
                            >
                              #{tag.value || tag.slug}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {profileMsg && <p className={styles.msg}>{profileMsg}</p>}
                <Button onClick={handleProfileSave} loading={profileLoading}>Guardar perfil</Button>

                <DashboardPostsList posts={userPosts} />
              </motion.div>
            )}

            {activeTab === 'nuevo-poema' && (
              <motion.div key="nuevo-poema" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={styles.panel}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="postTitle">Título</label>
                  <input id="postTitle" className={styles.input} value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="El nombre de tu poema" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="postContent">Contenido (Markdown)</label>
                  <textarea id="postContent" className={styles.textarea} value={postContent} onChange={(e) => setPostContent(e.target.value)} placeholder="Escribe tu poema aquí..." rows={12} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="postSlug">Slug (opcional)</label>
                  <input id="postSlug" className={styles.input} value={postSlug} onChange={(e) => setPostSlug(e.target.value)} placeholder={postTitle ? generateSlug(postTitle) : 'generado-automaticamente'} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Etiquetas (máx 4)</label>
                  <div className={styles.tagsContainer}>
                    {tagsLoading ? (
                      <p>Cargando etiquetas...</p>
                    ) : (
                      <div className={styles.tagList}>
                        {availableTags.map(tag => {
                          const isSelected = postTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setPostTags(prev => prev.filter(id => id !== tag.id));
                                } else if (postTags.length < 4) {
                                  setPostTags(prev => [...prev, tag.id]);
                                }
                              }}
                              className={`${styles.tagButton} ${isSelected ? styles.tagSelected : ''}`}
                              disabled={!isSelected && postTags.length >= 4}
                            >
                              #{tag.value || tag.slug}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={postVisible} onChange={(e) => setPostVisible(e.target.checked)} />
                    <span>Visible</span>
                  </label>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={postIndexed} onChange={(e) => setPostIndexed(e.target.checked)} />
                    <span>En portada y notificar</span>
                  </label>
                </div>

                <div className={styles.shaderSection}>
                  <button
                    className={styles.shaderToggle}
                    onClick={() => setShowShaderEditor(!showShaderEditor)}
                    aria-expanded={showShaderEditor}
                    aria-label="Togglear editor de shader"
                  >
                    {showShaderEditor
                      ? '— Cerrar editor'
                      : postShaderCode
                        ? '✦ Editar shader (alquimia)'
                        : '+ Añadir shader (alquimia)'}
                  </button>
                  <AnimatePresence>
                    {showShaderEditor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <ShaderEditor
                          initialCode={postShaderCode || DEFAULT_SHADER}
                          onSave={(code) => { setPostShaderCode(code); setShowShaderEditor(false); }}
                          onClose={() => setShowShaderEditor(false)}
                          onCodeChange={setShaderPreviewCode}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {postShaderCode && !showShaderEditor && (
                    <p className={styles.shaderActive}>✦ Shader activo</p>
                  )}
                </div>

                {postMsg && <p className={styles.msg}>{postMsg}</p>}
                {savedPostSlug && (
                  <Link
                    href={`/u/${encodeURIComponent(user.id)}/p/${savedPostSlug}`}
                    className={styles.viewPostLink}
                  >
                    Ver el poema →
                  </Link>
                )}
                
                <div className={styles.actionRow}>
                  <Button onClick={handlePostSave} loading={postLoading}>
                    {editingPostId ? 'Actualizar poema' : 'Publicar poema'}
                  </Button>
                </div>

                {editingPostId && (editNextPost || editPrevPost) && (
                  <nav className={styles.editNav}>
                    {editNextPost && (
                      <Link href={`/dashboard?edit=post&id=${editNextPost.id}`} className={styles.editNavLink}>
                        ← {editNextPost.title}
                      </Link>
                    )}
                    <div className={styles.editNavSpacer} />
                    {editPrevPost && (
                      <Link href={`/dashboard?edit=post&id=${editPrevPost.id}`} className={`${styles.editNavLink} ${styles.editNavRight}`}>
                        {editPrevPost.title} →
                      </Link>
                    )}
                  </nav>
                )}

                {editingPostId && (
                  <div className={styles.dangerZone}>
                    {!deletePostConfirm ? (
                      <button
                        className={styles.dangerTrigger}
                        type="button"
                        onClick={() => setDeletePostConfirm(true)}
                      >
                        Eliminar poema
                      </button>
                    ) : (
                      <div className={styles.dangerConfirm}>
                        <span className={styles.dangerWarning}>¿Eliminar permanentemente?</span>
                        <button
                          className={styles.dangerConfirmBtn}
                          type="button"
                          onClick={handleDeletePost}
                          disabled={isDeletingPost}
                        >
                          {isDeletingPost ? 'Eliminando...' : 'Sí, eliminar'}
                        </button>
                        <button
                          className={styles.dangerCancelBtn}
                          type="button"
                          onClick={() => setDeletePostConfirm(false)}
                          disabled={isDeletingPost}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <DashboardPostsList posts={userPosts} activePostId={editingPostId} />
              </motion.div>
            )}

            {activeTab === 'nuevo-evento' && (
              <motion.div key="nuevo-evento" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={styles.panel}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="eventTitle">Título del evento</label>
                  <input id="eventTitle" className={styles.input} value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Noche de poemas" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="eventDesc">Descripción</label>
                  <textarea id="eventDesc" className={styles.textarea} value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} placeholder="Describe el evento..." rows={4} />
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="eventDay">Día</label>
                    <input id="eventDay" type="date" className={styles.input} value={eventDay} onChange={(e) => setEventDay(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="eventHour">Hora</label>
                    <input id="eventHour" type="time" className={styles.input} value={eventHour} onChange={(e) => setEventHour(e.target.value)} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="eventPlace">Lugar</label>
                  <input id="eventPlace" className={styles.input} value={eventPlace} onChange={(e) => setEventPlace(e.target.value)} placeholder="Café Lluvia, San José" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="eventPrice">Precio (0 para entrada libre)</label>
                  <input id="eventPrice" type="number" className={styles.input} value={eventPrice} onChange={(e) => setEventPrice(e.target.value)} placeholder="0" min="0" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Etiquetas (máx 4)</label>
                  <div className={styles.tagsContainer}>
                    {tagsLoading ? (
                      <p>Cargando etiquetas...</p>
                    ) : (
                      <div className={styles.tagList}>
                        {availableTags.map(tag => {
                          const isSelected = eventTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setEventTags(prev => prev.filter(id => id !== tag.id));
                                } else if (eventTags.length < 4) {
                                  setEventTags(prev => [...prev, tag.id]);
                                }
                              }}
                              className={`${styles.tagButton} ${isSelected ? styles.tagSelected : ''}`}
                              disabled={!isSelected && eventTags.length >= 4}
                            >
                              #{tag.value || tag.slug}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {eventMsg && <p className={styles.msg}>{eventMsg}</p>}
                
                <div className={styles.actionRow}>
                  <Button onClick={handleEventSave} loading={eventLoading}>
                    {editingEventId ? 'Actualizar evento' : 'Crear evento'}
                  </Button>
                </div>

                {editingEventId && (editNextEvent || editPrevEvent) && (
                  <nav className={styles.editNav}>
                    {editNextEvent && (
                      <Link href={`/dashboard?edit=event&id=${editNextEvent.id}`} className={styles.editNavLink}>
                        ← {editNextEvent.title}
                      </Link>
                    )}
                    <div className={styles.editNavSpacer} />
                    {editPrevEvent && (
                      <Link href={`/dashboard?edit=event&id=${editPrevEvent.id}`} className={`${styles.editNavLink} ${styles.editNavRight}`}>
                        {editPrevEvent.title} →
                      </Link>
                    )}
                  </nav>
                )}

                {editingEventId && (
                  <div className={styles.dangerZone}>
                    {!deleteEventConfirm ? (
                      <button
                        className={styles.dangerTrigger}
                        type="button"
                        onClick={() => setDeleteEventConfirm(true)}
                      >
                        Cancelar y eliminar evento
                      </button>
                    ) : (
                      <div className={styles.dangerConfirm}>
                        <span className={styles.dangerWarning}>¿Eliminar permanentemente?</span>
                        <button
                          className={styles.dangerConfirmBtn}
                          type="button"
                          onClick={handleDeleteEvent}
                          disabled={isDeletingEvent}
                        >
                          {isDeletingEvent ? 'Eliminando...' : 'Sí, eliminar'}
                        </button>
                        <button
                          className={styles.dangerCancelBtn}
                          type="button"
                          onClick={() => setDeleteEventConfirm(false)}
                          disabled={isDeletingEvent}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
  );
}
