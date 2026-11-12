const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'A valid email address is required';
  }
  const trimmed = email.trim();
  if (trimmed.length > 255) {
    return 'Email address cannot exceed 255 characters';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'A valid email address is required';
  }

  const atIndex = trimmed.indexOf('@');
  const domain = trimmed.substring(atIndex + 1);

  if (domain.includes('..')) {
    return 'Email address domain cannot contain consecutive dots';
  }
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return 'Email address domain cannot start or end with a dot';
  }

  return null;
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string') {
    return 'Password must be a string';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 128) {
    return 'Password cannot exceed 128 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z)';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z)';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number (0-9)';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}

function validateRegisterPayload(req, res, next) {
  const { name, email, password } = req.body || {};

  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long');
  } else if (name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push(emailError);
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    errors.push(passwordError);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration input',
        details: errors,
      },
    });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();

  next();
}

function validateLoginPayload(req, res, next) {
  const { email, password } = req.body || {};

  const errors = [];

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push(emailError);
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid login input',
        details: errors,
      },
    });
  }

  req.body.email = email.trim().toLowerCase();

  next();
}

module.exports = {
  EMAIL_REGEX,
  validateEmail,
  validateRegisterPayload,
  validateLoginPayload,
  validatePasswordStrength,
};
