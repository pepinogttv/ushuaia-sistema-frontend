/**
 * Shared helpers for fingerprint type display (color, label, icon)
 * and fingerprint string parsing.
 *
 * Used by: AddSourceDialog, ColumnMappingEditor, FingerprintExamplesDialog
 */
export function useFingerprintHelpers() {
  const getTypeColor = (type) => {
    if (type.startsWith("string:")) return "blue-darken-1";
    const colors = {
      string: "blue",
      number: "green",
      price: "purple",
      date: "orange",
      boolean: "teal",
      email: "indigo",
      link: "cyan",
      empty: "grey",
    };
    return colors[type] || "grey";
  };

  const getTypeLabel = (type) => {
    if (type.startsWith("string:")) return `Texto: ${type.slice(7)}`;
    const labels = {
      string: "Texto",
      number: "Número",
      price: "Precio",
      date: "Fecha",
      boolean: "Sí/No",
      email: "Email",
      link: "Enlace",
      empty: "Vacío",
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    if (type.startsWith("string:")) return "mdi-format-text";
    const icons = {
      string: "mdi-format-text",
      number: "mdi-numeric",
      price: "mdi-currency-usd",
      date: "mdi-calendar",
      boolean: "mdi-toggle-switch",
      email: "mdi-email",
      link: "mdi-link",
      empty: "mdi-checkbox-blank-outline",
    };
    return icons[type] || "mdi-help";
  };

  const parseFingerprint = (fingerprint) => {
    if (!fingerprint) return [];
    return fingerprint.split("|");
  };

  return {
    getTypeColor,
    getTypeLabel,
    getTypeIcon,
    parseFingerprint,
  };
}
