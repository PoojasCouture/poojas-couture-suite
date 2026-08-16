// functions/api/_lib/validate.js
// -----------------------------------------------------------------------
// Shared, dependency-free request validation for credential-issuing
// endpoints (create-user.js, admin-reset-password.js).
//
// WHY NOT ZOD/JOI: this repo has no package.json, so Cloudflare Pages'
// Functions build has no npm install step — `import { z } from 'zod'`
// would either fail to resolve at deploy or require adding a build
// dependency first, which is an infra decision, not a validation fix.
// This module deliberately mirrors Zod's {success, data}/{success:false,
// errors} shape so migrating to real Zod later (once/if package.json
// exists) is a drop-in swap, not a rewrite.
//
// LOCATION: this file lives under functions/api/_lib/ specifically
// because Cloudflare Pages Functions treats any file/folder whose name
// starts with "_" as non-routed shared code — it will never become a
// live /api/_lib/validate endpoint, only an importable module. This is
// Cloudflare's own documented convention for exactly this use case.
//
// DESIGN PRINCIPLE (per explicit instruction): reject malformed input,
// don't silently clean it. Free-text fields that contain anything
// HTML/script-like are REJECTED outright — never stripped and
// re-accepted. A false-positive rejection (a legit name containing a
// literal "<") is an acceptable trade against a stored-XSS false
// negative.
// -----------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Deliberately conservative. Applied to free-text fields that get
// rendered back into the UI (name, department, role) — NOT applied to
// password, which is never rendered back and shouldn't have its
// character set restricted for that reason.
const HTML_LIKE_RE = /[<>]|javascript:|on\w+\s*=/i;

function isStr(v) {
  return typeof v === 'string';
}

/**
 * Validate an email field.
 * @returns {string|null} rejection reason, or null if valid
 */
function checkEmail(v) {
  if (!isStr(v)) return 'must be a string';
  const t = v.trim();
  if (!t) return 'required';
  if (t.length > 254) return 'too long'; // RFC 5321 practical cap
  if (!EMAIL_RE.test(t)) return 'not a valid email address';
  return null;
}

/**
 * Validate a password field. Length only, deliberately — see file header
 * for why content/character-set restrictions don't apply here.
 */
function checkPassword(v) {
  if (!isStr(v)) return 'must be a string';
  if (!v) return 'required';
  if (v.length < 8) return 'must be at least 8 characters';
  if (v.length > 128) return 'too long';
  return null;
}

/**
 * Validate a free-text field (name, department, role, etc.) that will be
 * stored and later rendered in the UI. Rejects HTML/script-like content
 * outright rather than stripping it.
 */
function checkFreeText(v, { required = true, min = 1, max = 100 } = {}) {
  if (v === undefined || v === null || v === '') {
    return required ? 'required' : null;
  }
  if (!isStr(v)) return 'must be a string';
  const t = v.trim();
  if (t.length < min) return `must be at least ${min} character(s)`;
  if (t.length > max) return `must be ${max} characters or fewer`;
  if (HTML_LIKE_RE.test(t)) return 'contains disallowed characters';
  return null;
}

/**
 * Validate the create-user request body.
 * @returns {{success:true, data:object}|{success:false, errors:object}}
 */
function validateCreateUser(body) {
  const errors = {};
  const name = body && body.name;
  const email = body && body.email;
  const password = body && body.password;
  const department = body && body.department;
  const role = body && body.role;

  const nameErr = checkFreeText(name, { min: 1, max: 100 });
  if (nameErr) errors.name = nameErr;

  const emailErr = checkEmail(email);
  if (emailErr) errors.email = emailErr;

  const passwordErr = checkPassword(password);
  if (passwordErr) errors.password = passwordErr;

  const deptErr = checkFreeText(department, { required: false, max: 60 });
  if (deptErr) errors.department = deptErr;

  const roleErr = checkFreeText(role, { required: false, max: 60 });
  if (roleErr) errors.role = roleErr;

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password, // not trimmed — leading/trailing space can be intentional in a password
      department: department ? department.trim() : null,
      role: role ? role.trim() : null
    }
  };
}

/**
 * Validate the admin-reset-password request body.
 */
function validateResetPassword(body) {
  const errors = {};
  const targetEmail = body && body.targetEmail;
  const newPassword = body && body.newPassword;

  const emailErr = checkEmail(targetEmail);
  if (emailErr) errors.targetEmail = emailErr;

  const passwordErr = checkPassword(newPassword);
  if (passwordErr) errors.newPassword = passwordErr;

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      targetEmail: targetEmail.trim().toLowerCase(),
      newPassword
    }
  };
}

export { validateCreateUser, validateResetPassword };
