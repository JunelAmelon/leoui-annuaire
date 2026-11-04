// Erreurs métier LeOui Market — chaque erreur porte son code HTTP
// pour être mappée directement en réponse API.

export class MarketError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = 'MarketError';
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends MarketError {
  readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 'VALIDATION', 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class UnauthorizedError extends MarketError {
  constructor(message = 'Authentification requise') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends MarketError {
  constructor(message = 'Accès interdit') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends MarketError {
  constructor(message = 'Ressource introuvable') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class TooManyRequestsError extends MarketError {
  constructor(message = 'Trop de requêtes. Réessayez dans un instant.') {
    super(message, 'RATE_LIMITED', 429);
    this.name = 'TooManyRequestsError';
  }
}

export class ConflictError extends MarketError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
