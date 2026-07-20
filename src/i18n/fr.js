export const fr = {
  buttonLabel: 'Signaler',
  modalTitle: 'Envoyer un signalement',
  subtitle: 'Décrivez le problème — le contexte technique sera joint automatiquement.',
  typeLabel: 'Type',
  titleLabel: 'Titre',
  messageLabel: 'Description',
  emailLabel: 'Email (optionnel)',
  screenshotConsent: 'Inclure une capture d’écran de la page',
  connectLabel: 'Se connecter',
  connectedLabel: 'Connecté',
  notConnectedLabel: 'Non connecté au tracker',
  logoutLabel: 'Déconnexion',
  submitLabel: 'Envoyer',
  cancelLabel: 'Annuler',
  closeLabel: 'Fermer',
  sending: 'Envoi en cours…',
  success: 'Merci, votre signalement a bien été envoyé.',
  error: 'Échec de l’envoi. Réessayez ou contactez le support.',
  required: 'Champ requis',
  types: {
    bug: 'Problème / bug',
    help: 'Demande d’aide',
    suggestion: 'Suggestion',
    question: 'Question',
  },
};

/**
 * @param {Record<string, unknown>} [overrides]
 */
export function resolveI18n(overrides = {}) {
  return deepMerge(fr, overrides);
}

function deepMerge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(base[k] || {}, v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}
