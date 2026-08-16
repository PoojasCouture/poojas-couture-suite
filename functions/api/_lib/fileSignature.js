// functions/api/_lib/fileSignature.js
// -----------------------------------------------------------------------
// Verifies a file's REAL type by inspecting its actual bytes (magic
// numbers / file signatures), instead of trusting whatever MIME type or
// file extension the uploader declared. This is the core fix for every
// upload endpoint in this app: previously, `mimeType` (from the request
// body) and the file's extension (from its name) were both fully
// attacker-controlled strings, used directly to decide what Content-Type
// gets stored on the object — meaning a file's real bytes were never
// actually checked against what it claimed to be.
//
// WHY THIS MATTERS EVEN THOUGH THE SUPABASE BUCKETS ALREADY HAVE AN
// allowed_mime_types LIST: that bucket-level allowlist only checks the
// DECLARED Content-Type header on the upload request — it has no way to
// see whether the bytes behind that header are actually a JPEG, or
// something else entirely. This module closes that specific gap: it
// inspects the real bytes and returns the type they actually are, which
// is what should be trusted and stored — never the client's claim.
//
// DESIGN PRINCIPLE (same as functions/api/_lib/validate.js): REJECT a
// mismatch outright, don't silently "fix" it by re-labeling the file to
// match its detected type and proceeding anyway. If someone declares
// "image/jpeg" and the bytes are something else, that's suspicious
// enough to refuse, not smooth over.
//
// Supported signatures — deliberately limited to exactly what this app's
// two storage buckets already allow (job-photos, intake-docs). Nothing
// here whitelists SVG, HTML, or any script-capable format — there is no
// legitimate use case for those in a photo/document upload feature, and
// SVG in particular has no reliable byte signature since it's just XML
// text, so it's excluded entirely rather than half-supported.
// -----------------------------------------------------------------------

/**
 * Detect the real file type from its raw bytes. Returns the MIME type
 * string if recognized, or null if the bytes don't match any known
 * signature this app cares about.
 * @param {Uint8Array} bytes
 * @returns {string|null}
 */
function detectFileType(bytes) {
  if (!bytes || bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return 'image/png';
  }

  // WebP: 'RIFF' .... 'WEBP'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  // HEIC/HEIF: 'ftyp' box at offset 4, brand at offset 8 is one of the
  // HEIC/HEIF family codes. Simplified check: enough to distinguish real
  // HEIC files from arbitrary other content, without implementing a full
  // ISO base media file format parser.
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 // 'ftyp'
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return 'image/heic';
    }
  }

  // PDF: '%PDF'
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  // DOCX (and any modern Office Open XML format): ZIP signature 'PK\x03\x04'.
  // KNOWN LIMITATION: can't distinguish a real .docx from a generic .zip
  // by outer signature alone — that requires inspecting the ZIP central
  // directory for a `[Content_Types].xml` entry, not implemented here.
  // Acceptable trade-off: the actual security exposure this module
  // exists to close (a file executing as script when opened) doesn't
  // apply to this ambiguity — a mislabeled plain zip stored as "docx"
  // is a data-integrity nuisance, not a code-execution path.
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  // Legacy .doc: OLE Compound File signature D0 CF 11 E0 A1 B1 1A E1.
  // KNOWN LIMITATION: this signature is shared by ALL legacy Office
  // formats (.doc, .xls, .ppt, .msi) — distinguishing them precisely
  // requires parsing the internal OLE stream directory, not just the
  // outer container. Not implemented here. This still catches the main
  // threat (something that isn't a legacy Office file at all, renamed
  // and declared as one) — it just can't tell a real .doc from a
  // mislabeled .xls. Acceptable given intake-docs only needs to
  // distinguish "real Office document" from "not one".
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0 &&
    bytes[4] === 0xA1 && bytes[5] === 0xB1 && bytes[6] === 0x1A && bytes[7] === 0xE1
  ) {
    return 'application/msword';
  }

  return null;
}

/**
 * Validate that a file's real bytes match an allowed type, and reject
 * outright on any mismatch or unrecognized content — never silently
 * relabel and continue.
 *
 * @param {Uint8Array} bytes            the actual decoded file bytes
 * @param {string[]} allowedMimeTypes   MIME types this endpoint accepts
 * @returns {{valid:true, mimeType:string}|{valid:false, reason:string}}
 *   On success, `mimeType` is the VERIFIED real type (from bytes) — this
 *   is what callers should use as the storage Content-Type, never the
 *   client's declared value.
 */
function validateFileType(bytes, allowedMimeTypes) {
  const detected = detectFileType(bytes);
  if (!detected) {
    return { valid: false, reason: 'File content not recognized as any supported type' };
  }
  if (!allowedMimeTypes.includes(detected)) {
    return { valid: false, reason: `Detected file type (${detected}) is not allowed here` };
  }
  return { valid: true, mimeType: detected };
}

export { detectFileType, validateFileType };
