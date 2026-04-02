const i18n = {
  common: {
    loading: 'Cargando...',
    error: 'Ocurrió un error inesperado.',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    search: 'Buscar',
    explore: 'Explorar',
    home: 'Inicio',
    profile: 'Perfil',
    events: 'Eventos',
    poems: 'Poemas',
    poets: 'Poetas',
    saved: 'Guardados',
    settings: 'Ajustes',
    logout: 'Cerrar sesión',
    login: 'Ingresar',
    back: 'Volver',
    send: 'Enviar',
    join: 'Unirme',
    waiting: 'Esperando...',
    accepted: 'Aceptado',
    pending: 'Pendiente',
    seeMore: 'Ver más',
  },
  home: {
    hero: {
      title: 'CHUBASCOS',
      subtitle: 'Lluvias repentinas dejando charcos.',
      cta: 'Empezar a escribir',
    },
    liveFeed: {
      title: 'Charcos Recientes',
      empty: 'No hay poemas recientes todavía.',
    },
    events: {
      title: 'Próximos Encuentros',
      empty: 'No hay eventos programados.',
    },
    poets: {
      title: 'Voces Destacadas',
      empty: 'No hay poetas registrados.',
    },
  },
  auth: {
    title: 'Entrar a Chubascos',
    subtitle: 'Introduce tu email para recibir un código de acceso.',
    emailPlaceholder: 'tu@email.com',
    sendOtp: 'Enviar código',
    otpTitle: 'Verifica tu identidad',
    otpSubtitle: 'Hemos enviado un código a {email}',
    otpPlaceholder: '000000',
    verify: 'Verificar código',
    errorInvalidEmail: 'Email no válido.',
    errorInvalidOtp: 'Código no válido.',
  },
  search: {
    title: 'Explorar el Hub',
    inputPlaceholder: 'Buscar por nombre, etiquetas...',
    filters: {
      all: 'Todo',
      poets: 'Poetas',
      poems: 'Poemas',
      events: 'Eventos',
    },
    empty: 'No se encontraron resultados para tu búsqueda.',
  },
  saved: {
    title: 'Tus Guardados',
    empty: 'No has guardado ningún poema, poeta ni evento todavía.',
    tabs: {
      poems: 'Poemas ({count})',
      poets: 'Poetas ({count})',
      events: 'Eventos ({count})',
    },
    emptyTab: 'Sin {type} guardados.',
  },
  profile: {
    edit: 'Editar perfil',
    bioPlaceholder: 'Cuéntanos un poco sobre ti...',
    contactsTitle: 'Contacto y Redes',
    poemsTitle: 'Sus Poemas',
    emptyPoems: 'Este poeta aún no ha dejado ningún charco.',
    saveUser: 'Seguir poeta',
    unsaveUser: 'Dejar de seguir',
  },
  event: {
    detailsTitle: 'Detalles del Evento',
    participantsTitle: 'Participantes Confirmados',
    emptyParticipants: 'Aún no hay participantes confirmados.',
    joinEvent: 'Quiero asistir',
    joinSuccess: 'Solicitud enviada.',
    priceFree: 'Gratis',
    organizer: 'Organizado por',
  },
  footer: {
    rights: '© {year} Chubascos. Todos los derechos reservados.',
    norms: 'Normas de la comunidad',
    privacy: 'Privacidad',
  },
  norms: {
    communityTitle: 'Normas de comunidad',
    rightsTitle: 'Tu obra, tu derecho',
    items: {
      respect: 'El respeto es absoluto. No toleramos la crueldad.',
      authentic: 'Publica solo contenido auténtico. El plagio deshonra.',
      consent: 'El consentimiento digital y el cuidado son esenciales.',
      goodFaith: 'Actúa de buena fe.',
      ownership: 'Todo lo que publicas te pertenece exclusivamente a ti.',
      noSell: 'No vendemos ni licenciamos tu arte a terceros.',
      privacy: 'Solo pedimos tu correo. No rastreamos tus datos de uso.',
      delete: 'Puedes eliminar tu obra y tu cuenta en cualquier momento.'
    }
  },
  notifications: {
    postSubject: 'Nuevo poema de {author}: {title}',
    eventSubject: 'Nuevo evento de {author}: {title}',
    subscriptionSubject: 'Nueva solicitud para tu evento: {title}',
    postDesc: 'Alguien que sigues ha dejado un nuevo charco.',
    eventDesc: 'Alguien que sigues ha creado un nuevo evento.',
    subscriptionDesc: '{author} quiere asistir a tu evento.',
    readPoem: 'Leer poema',
    viewEvent: 'Ver evento',
    manageParticipants: 'Gestionar participantes',
  }
} as const;

export default i18n;

export type I18nPath = keyof typeof i18n;
