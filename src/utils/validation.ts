import { VALIDATION_RULES, SECURITY_CONFIG } from '../config/constants';

export function validateDomain(domain: string): boolean {
  if (!domain || domain.length === 0) {
    return false;
  }

  if (domain.length > VALIDATION_RULES.MAX_DOMAIN_LENGTH) {
    return false;
  }
  if (!VALIDATION_RULES.DOMAIN_REGEX.test(domain)) {
    return false;
  }
  for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
    if (domain.toLowerCase().includes(pattern.toLowerCase())) {
      return false;
    }
  }
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63 || label.length === 0) {
      return false;
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }
  }
  if (labels.length < 2) {
    return false;
  }
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
    return false;
  }

  return true;
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>'"&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .substring(0, 1000);
}

export function validateDescription(description: string): boolean {
  if (!description || description.trim().length === 0) {
    return false;
  }

  if (description.length > VALIDATION_RULES.MAX_DESCRIPTION_LENGTH) {
    return false;
  }

  if (description.length < VALIDATION_RULES.MIN_DESCRIPTION_LENGTH) {
    return false;
  }
  for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
    if (description.toLowerCase().includes(pattern.toLowerCase())) {
      return false;
    }
  }

  return true;
}

export function validateTargetList(targetList: string): boolean {
  const validTargets = ['dns', 'http', 'both'];
  return validTargets.includes(targetList);
}

export function validateRequestSize(contentLength: number): boolean {
  return contentLength <= SECURITY_CONFIG.MAX_REQUEST_SIZE;
}