const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const { generateToken, verifyToken } = require('../utils/token.util');
const { BCRYPT_SALT_ROUNDS } = require('../constants/auth.constants');

class AuthError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function register({ name, email, password }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new AuthError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || BCRYPT_SALT_ROUNDS, 10);
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const newUser = await userRepository.create({
    name,
    email,
    passwordHash,
  });

  const token = generateToken({
    userId: newUser.id,
    tokenVersion: newUser.token_version,
  });

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    },
    token,
  };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    // Avoid user enumeration
    throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AuthError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = generateToken({
    userId: user.id,
    tokenVersion: user.token_version,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
  };
}

async function logout(userId) {
  if (userId) {
    // Invalidate any active JWT sessions server-side by incrementing token version
    await userRepository.incrementTokenVersion(userId);
  }
}

async function verifySession(token) {
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthError('Session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    throw new AuthError('Invalid session token.', 401, 'INVALID_TOKEN');
  }

  const user = await userRepository.findById(decoded.userId);
  if (!user) {
    throw new AuthError('User account not found or has been deleted.', 401, 'USER_NOT_FOUND');
  }

  if (user.token_version !== decoded.tokenVersion) {
    throw new AuthError('Session has been invalidated. Please log in again.', 401, 'SESSION_REVOKED');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

module.exports = {
  AuthError,
  register,
  login,
  logout,
  verifySession,
};
