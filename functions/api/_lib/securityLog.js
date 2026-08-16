// functions/api/_lib/securityLog.js
// -----------------------------------------------------------------------
// Logs rejected/malicious submissions to credential-issuing endpoints so
// attack attempts are visible after the fact, not just in the moment.
//
// WHY audit_logs AND NOT A NEW TABLE: this project's own handoff history
// (11 July, 13 Aug) has multiple incidents caused by new tables shipping
// with RLS enabled and zero policies, silently unusable. `audit_logs`
// already exists, is already written to for real activity (logins,
// permission changes, password resets), and already has whatever RLS/
// access setup makes it usable today. Reusing it avoids adding a new
// table with its own access-control surface to get wrong. Rejected
// submissions are tagged with a distinct `category` so they're easy to
// filter out from normal activity.
//
// MUST NEVER THROW: a logging failure must not change the response sent
// to the caller, or become a way to make the real check fail differently
// depending on whether logging succeeded. Every call site treats this as
// fire-and-forget.
//
// MUST NEVER LOG SECRETS: password/newPassword values are never passed
// into this function's `details` — only field NAMES and REASONS are
// logged, never the rejected value itself for password fields. Free-text
// field values (name, department, role) are logged truncated, since
// seeing the actual attempted payload (e.g. the literal XSS string) is
// the whole point of a rejected-submission log.
// -----------------------------------------------------------------------

const MAX_DETAIL_LEN = 500;

/**
 * @param {string} supabaseUrl
 * @param {object} svcHeaders  service-role auth headers, already built by the caller
 * @param {object} opts
 * @param {string} opts.endpoint       e.g. 'create-user', 'admin-reset-password'
 * @param {string} [opts.attemptedEmail]  email involved in the attempt, if any (safe to log — not a secret)
 * @param {string} [opts.callerEmail]     authenticated caller's email, if known
 * @param {object} [opts.errors]      field->reason map from validate.js
 * @param {string} [opts.reason]      free-text reason for non-field-validation rejections (auth/authz/duplicate/upstream)
 */
async function logRejectedSubmission(supabaseUrl, svcHeaders, opts) {
  try {
    const errorSummary = opts.errors
      ? Object.entries(opts.errors).map(([field, reason]) => `${field}: ${reason}`).join('; ')
      : (opts.reason || 'rejected');

    const details = [
      `endpoint=${opts.endpoint}`,
      opts.attemptedEmail ? `attemptedEmail=${opts.attemptedEmail}` : null,
      opts.callerEmail ? `callerEmail=${opts.callerEmail}` : null,
      `reason=${errorSummary}`
    ].filter(Boolean).join(' | ').slice(0, MAX_DETAIL_LEN);

    await fetch(supabaseUrl + '/rest/v1/audit_logs', {
      method: 'POST',
      headers: svcHeaders,
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        user_name: opts.callerEmail || 'Unknown/Unauthenticated',
        category: 'Security - Rejected Submission',
        action: 'Rejected Submission',
        details
      })
    });
  } catch (e) {
    // Deliberately swallowed — see file header. Logging must never affect
    // the actual response or become a second failure mode.
  }
}

export { logRejectedSubmission };
