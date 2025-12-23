export function formatAccountDisplayName(accountName: string | null | undefined, maxLength: number = 25): string {
  if (!accountName) return '';
  
  const trimmed = accountName.trim();
  
  if (isUrl(trimmed)) {
    const extracted = extractIdFromUrl(trimmed);
    if (extracted) return extracted;
  }
  
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  
  return trimmed.substring(0, maxLength) + '...';
}

function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return str.startsWith('http://') || str.startsWith('https://') || str.includes('google.com/');
  }
}

function extractIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (url.includes('business.google.com') || url.includes('google.com/business')) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const numericId = pathParts.find(part => /^\d+$/.test(part));
      if (numericId) {
        return `ID: ${numericId}`;
      }
    }
    
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart && lastPart.length <= 30) {
      return lastPart;
    }
    
    if (lastPart && /^\d+$/.test(lastPart)) {
      return `ID: ${lastPart}`;
    }
    
    return urlObj.hostname.replace('www.', '');
  } catch {
    const numericMatch = url.match(/\/(\d{10,})(?:\/|$|\?)/);
    if (numericMatch) {
      return `ID: ${numericMatch[1]}`;
    }
    
    return null;
  }
}

export function getFullAccountName(accountName: string | null | undefined): string {
  return accountName?.trim() || '';
}
