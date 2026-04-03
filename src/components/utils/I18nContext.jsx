import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'appLanguage';

const translations = {
  es: {
    'Berean Examination': 'Examinación Bereana',
    'In-depth Biblical Expository Study': 'Estudio expositivo bíblico en profundidad',
    'Enter Access Key': 'Ingresa la clave de acceso',
    'Required for first-time access': 'Requerido para el primer acceso',
    'Invalid access key. Please check and try again.': 'Clave de acceso no válida. Verifícala e inténtalo de nuevo.',
    'This key has been revoked.': 'Esta clave ha sido revocada.',
    'This key has been temporarily paused.': 'Esta clave ha sido pausada temporalmente.',
    'This key is no longer valid.': 'Esta clave ya no es válida.',
    'This key is already in use. Please sign in with your account.': 'Esta clave ya está en uso. Inicia sesión con tu cuenta.',
    'Something went wrong. Please try again.': 'Algo salió mal. Inténtalo de nuevo.',
    'Preparing your workspace...': 'Preparando tu espacio de trabajo...',
    'Continue': 'Continuar',
    'Already have an account?': '¿Ya tienes una cuenta?',
    'Sign In': 'Iniciar sesión',
    'Access keys are provided by invitation only.': 'Las claves de acceso se proporcionan solo por invitación.',
    'Contact Admin': 'Contactar al administrador',
    'Account Center': 'Centro de cuenta',
    'Go to Study': 'Ir a Estudio',
    'Go to Keywords': 'Ir a Palabras clave',
    'Go to Admin Panel': 'Ir al panel de administración',
    'Sign Out': 'Cerrar sesión',
    'Account Center': 'Centro de cuenta',
    'Profile': 'Perfil',
    'Manage your personal information': 'Administra tu información personal',
    'Preferences': 'Preferencias',
    'Customize your experience': 'Personaliza tu experiencia',
    'Security': 'Seguridad',
    'Password and authentication': 'Contraseña y autenticación',
    'Notifications': 'Notificaciones',
    'Email and app alerts': 'Alertas por correo y en la app',
    'Privacy': 'Privacidad',
    'Privacy and data settings': 'Configuración de privacidad y datos',
    'Security Settings': 'Configuración de seguridad',
    'Coming soon - Advanced security features': 'Próximamente: funciones avanzadas de seguridad',
    'Loading Account Center...': 'Cargando el centro de cuenta...',
    'Quick Actions': 'Acciones rápidas',
    'Role': 'Rol',
    'Member since': 'Miembro desde',
    'Admin': 'Administrador',
    'User': 'Usuario',
    'Appearance': 'Apariencia',
    'Theme': 'Tema',
    'Light': 'Claro',
    'Dark': 'Oscuro',
    'Font Size': 'Tamaño de fuente',
    'Small': 'Pequeño',
    'Medium': 'Mediano',
    'Large': 'Grande',
    'Reading': 'Lectura',
    'Verse Display Format': 'Formato de visualización de versículos',
    'Inline (continuous)': 'En línea (continuo)',
    'Block (separate paragraphs)': 'En bloques (párrafos separados)',
    'General': 'General',
    'Time Zone': 'Zona horaria',
    'Default Landing Page': 'Página de inicio predeterminada',
    'Language': 'Idioma',
    'English': 'Inglés',
    'Spanish': 'Español',
    'Preferences updated successfully': 'Preferencias actualizadas correctamente',
    'Failed to update preferences': 'No se pudieron actualizar las preferencias',
    'Cancel': 'Cancelar',
    'Saving...': 'Guardando...',
    'Save Changes': 'Guardar cambios',
    'Loading your study...': 'Cargando tu estudio...',
    'Study': 'Estudio',
    'My Study Dashboard': 'Mi panel de estudio',
    'Chapter History': 'Historial de capítulos',
    'Select Chapter': 'Seleccionar capítulo',
    'Back': 'Atrás',
    'Bible Version': 'Versión bíblica',
    'Favorite': 'Favorita',
    'Favorited': 'Guardada',
    'saved as favorite': 'guardada como favorita',
    'Favorite Bible version cleared': 'Versión bíblica favorita eliminada',
    'Book': 'Libro',
    'Chapter': 'Capítulo',
    'Paste Chapter Text': 'Pegar texto del capítulo',
    'Prepare Text': 'Preparar texto',
    'Paste some text first': 'Primero pega algo de texto',
    'Text prepared with verse markers': 'Texto preparado con marcadores de versículo',
    'Nothing to copy': 'Nada para copiar',
    'Copied to clipboard': 'Copiado al portapapeles',
    'Loading Chapter...': 'Cargando capítulo...',
    'Back to Progress': 'Volver al progreso',
    'Study Another Chapter': 'Estudiar otro capítulo',
    'Annotations': 'Anotaciones',
    'No chapter text found': 'No se encontró texto del capítulo',
    'This chapter was created but has no text. Add the chapter text to begin studying.': 'Este capítulo fue creado pero no tiene texto. Agrega el texto del capítulo para comenzar a estudiar.',
    'Add Chapter Text': 'Agregar texto del capítulo',
    'This is a read-only section from the Literal Standard Version.': 'Esta es una sección de solo lectura de la Literal Standard Version.',
    'Display': 'Visualización',
    'Study Tools': 'Herramientas de estudio',
    'Hide Study Tools': 'Ocultar herramientas de estudio',
    'Feedback & Contact': 'Comentarios y contacto',
    'Sources & Licenses': 'Fuentes y licencias',
    'Add Annotation': 'Agregar anotación',
    'Edit Annotation': 'Editar anotación',
    'Delete': 'Eliminar',
    'Save': 'Guardar',
    'Must type at least 1 character': 'Debes escribir al menos 1 carácter',
    'Drawing saved': 'Dibujo guardado',
    'Interlinear Mode': 'Modo interlineal',
    'Show the matching source verse beneath the translation.': 'Muestra el versículo fuente correspondiente debajo de la traducción.',
    'Interlinear On': 'Interlineal activado',
    'Interlinear Off': 'Interlineal desactivado',
    'Source Text': 'Texto fuente',
    'Loading source text…': 'Cargando texto fuente…',
    'Interlinear Source: SBLGNT': 'Fuente interlineal: SBLGNT',
    'Interlinear Source: UXLC': 'Fuente interlineal: UXLC',
    'UXLC / Leningrad Codex': 'UXLC / Códice de Leningrado',
    'Reading Controls': 'Controles de lectura',
    'See Context': 'Ver contexto',
    'Add Context': 'Agregar contexto',
    'Chapter Notes': 'Notas del capítulo',
    'Add Notes': 'Agregar notas',
    'See Application': 'Ver aplicación',
    'Add Application': 'Agregar aplicación',
    'Edit Chapter Text': 'Editar texto del capítulo'
  }
};

const I18nContext = createContext({
  language: 'en',
  setLanguage: () => {},
  tr: (text) => text,
});

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return;
        const user = await base44.auth.me();
        const preferred = user?.preferred_language;
        if (preferred && preferred !== language) {
          setLanguageState(preferred);
        }
      } catch {}
    };
    loadLanguage();
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage: setLanguageState,
    tr: (text) => translations[language]?.[text] || text,
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}