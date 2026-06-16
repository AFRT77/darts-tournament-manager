export function getApiErrorMessage(body, fallback = 'Error en la petición') {
  const details = body?.error?.details;

  if (details?.fieldErrors) {
    const messages = Object.values(details.fieldErrors)
      .flat()
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join('. ');
    }
  }

  if (Array.isArray(details?.formErrors) && details.formErrors.length > 0) {
    return details.formErrors.join('. ');
  }

  return body?.error?.message || fallback;
}
