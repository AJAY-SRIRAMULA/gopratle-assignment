// Central error handler. Clients only ever get safe, generic messages;
// the real error is logged server-side (message only, never the request body).
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large' });
  }
  if (err.name === 'ValidationError') {
    return res.status(422).json({ success: false, message: 'Validation failed' });
  }
  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }
  if (err.name === 'MongooseError' || err.name?.startsWith('Mongo')) {
    console.error('Database error:', err.name);
    return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again shortly.' });
  }
  console.error('Unexpected error:', err.message);
  return res.status(500).json({ success: false, message: 'Something went wrong on the server' });
};
