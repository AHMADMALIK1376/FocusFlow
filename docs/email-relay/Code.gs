// FocusFlow email relay: sends mail through YOUR Gmail, called over HTTPS.
// Why it exists: Render's free plan blocks SMTP, so the server cannot talk to Gmail directly.
// This tiny script runs on Google's servers as you. FocusFlow posts the email to it with a shared secret.
//
// Setup (about 5 minutes) is in docs/email-relay/README.md. Quota: a free Gmail account may send about 100 emails a day through MailApp.

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || body.secret !== secret) return reply({ ok: false, error: 'bad secret' });
    if (!body.to || !body.subject) return reply({ ok: false, error: 'missing to or subject' });

    // Pictures embedded in the email (cid:...), sent as base64.
    var inlineImages = {};
    (body.inline || []).forEach(function (img) {
      inlineImages[img.cid] = Utilities.newBlob(Utilities.base64Decode(img.base64), img.mime || 'image/png', img.filename || (img.cid + '.png'));
    });

    MailApp.sendEmail(body.to, body.subject, body.text || '', {
      htmlBody: body.html || undefined,
      name: body.fromName || 'FocusFlow',
      inlineImages: inlineImages
    });
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String((err && err.message) || err) });
  }
}

// Opening the URL in a browser just says it is alive.
function doGet() {
  return reply({ ok: true, service: 'FocusFlow email relay' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
