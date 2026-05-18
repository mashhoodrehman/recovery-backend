function ok(res, data = null, message = 'Success', meta = undefined) {
  return res.status(200).json({ success: true, message, data, ...(meta && { meta }) });
}

function created(res, data = null, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, statusCode = 400, message = 'Request failed', details = null) {
  return res.status(statusCode).json({ success: false, message, details });
}

module.exports = { ok, created, noContent, fail };
