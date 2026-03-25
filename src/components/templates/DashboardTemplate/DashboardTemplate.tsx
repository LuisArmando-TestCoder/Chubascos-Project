'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/atoms/Button/Button';
import { ShaderEditor } from '@/components/organisms/ShaderEditor/ShaderEditor';
import { Footer } from '@/components/organisms/Footer/Footer';
import {
  createPost, updateUserProfile, createEvent, createShader
} from '@/actions/data';
import { logout } from '@/actions/auth';
import { generateSlug } from '@/utils/generateSlug';
import type { User } from '@/types';
import styles from './DashboardTemplate.module.scss';

interface DashboardTemplateProps {
  user: User;
}

type DashTab = 'perfil' | 'nuevo-poema' | 'nuevo-evento';

export function DashboardTemplate({ user }: DashboardTemplateProps) {
  const [activeTab, setActiveTab] = useState<DashTab>('perfil');
  const name = user.username || user.email.split('@')[0];

  // Profile state
  const [bio, setBio] = useState(user.bio || '');
  const [username, setUsername] = useState(user.username || '');
  const [contacts, setContacts] = useState(user.contacts || []);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Post state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postSlug, setPostSlug] = useState('');
  const [postTags, setPostTags] = useState('');
  const [postVisible, setPostVisible] = useState(true);
  const [postIndexed, setPostIndexed] = useState(true);
  const [postShaderCode, setPostShaderCode] = useState('');
  const [showShaderEditor, setShowShaderEditor] = useState(false);
  const [postMsg, setPostMsg] = useState('');
  const [postLoading, setPostLoading] = useState(false);

  // Event state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [eventHour, setEventHour] = useState('');
  const [eventPlace, setEventPlace] = useState('');
  const [eventPrice, setEventPrice] = useState('');
  const [eventMsg, setEventMsg] = useState('');
  const [eventLoading, setEventLoading] = useState(false);

  const handleProfileSave = useCallback(async () => {
    setProfileLoading(true);
    const result = await updateUserProfile(user.id, { bio, username, contacts });
    setProfileMsg(result.success ? 'Perfil actualizado.' : (result.error || 'Error.'));
    setProfileLoading(false);
  }, [user.id, bio, username, contacts]);

  const handlePostCreate = useCallback(async () => {
    if (!postTitle || !postContent) {
      setPostMsg('Título y contenido son obligatorios.');
      return;
    }
    setPostLoading(true);
    const tagIds = postTags.split(',').map((t) => t.trim()).filter(Boolean);
    const slug = postSlug || generateSlug(postTitle);

    // If shader code provided, create shader first
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
      tagIds,
      shaderId,
      isVisible: postVisible,
      isIndexed: postIndexed,
    });

    setPostMsg(result.success ? `Poema publicado. Slug: ${result.slug}` : (result.error || 'Error.'));
    if (result.success) {
      setPostTitle('');
      setPostContent('');
      setPostSlug('');
      setPostTags('');
      setPostShaderCode('');
    }
    setPostLoading(false);
  }, [user.id, postTitle, postContent, postSlug, postTags, postVisible, postIndexed, postShaderCode]);

  const handleEventCreate = useCallback(async () => {
    if (!eventTitle || !eventDay || !eventHour || !eventPlace) {
      setEventMsg('Título, día, hora y lugar son obligatorios.');
      return;
    }
    setEventLoading(true);
    const result = await createEvent(user.id, {
      title: eventTitle,
      description: eventDesc,
      day: new Date(eventDay),
      hour: eventHour,
      place: eventPlace,
      price: eventPrice !== '' ? parseFloat(eventPrice) : undefined,
      urls: [],
      contacts: [],
      tagIds: [],
    });
    setEventMsg(result.success ? 'Evento creado.' : (result.error || 'Error.'));
    if (result.success) {
      setEventTitle('');
      setEventDesc('');
      setEventDay('');
      setEventHour('');
      setEventPlace('');
      setEventPrice('');
    }
    setEventLoading(false);
  }, [user.id, eventTitle, eventDesc, eventDay, eventHour, eventPlace, eventPrice]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <h1 className={styles.greeting}>Bienvenido, {name}</h1>
              <button className={styles.logoutBtn} onClick={handleLogout} aria-label="Cerrar sesión">
                Salir
              </button>
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
                  {tab === 'perfil' ? 'Perfil' : tab === 'nuevo-poema' ? 'Nuevo poema' : 'Nuevo evento'}
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
                {profileMsg && <p className={styles.msg}>{profileMsg}</p>}
                <Button onClick={handleProfileSave} loading={profileLoading}>Guardar perfil</Button>
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
                  <label className={styles.label} htmlFor="postTags">Etiquetas (separadas por coma, máx 4)</label>
                  <input id="postTags" className={styles.input} value={postTags} onChange={(e) => setPostTags(e.target.value)} placeholder="poesía, lluvia, introspección" />
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
                    {showShaderEditor ? '— Quitar shader' : '+ Añadir shader (alquimia)'}
                  </button>
                  <AnimatePresence>
                    {showShaderEditor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <ShaderEditor
                          initialCode={postShaderCode}
                          onSave={(code) => { setPostShaderCode(code); setShowShaderEditor(false); }}
                          onClose={() => setShowShaderEditor(false)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {postShaderCode && !showShaderEditor && (
                    <p className={styles.shaderActive}>✦ Shader activo</p>
                  )}
                </div>

                {postMsg && <p className={styles.msg}>{postMsg}</p>}
                <Button onClick={handlePostCreate} loading={postLoading}>Publicar poema</Button>
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
                {eventMsg && <p className={styles.msg}>{eventMsg}</p>}
                <Button onClick={handleEventCreate} loading={eventLoading}>Crear evento</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
  );
}
