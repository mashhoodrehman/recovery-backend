const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadChat } = require('../middleware/upload.middleware');
const { getMessages, sendImage } = require('../controllers/chat.controller');

// GET  /mobile/rides/:rideId/messages
router.get('/', authenticate, getMessages);

// POST /mobile/rides/:rideId/messages/image
router.post('/image', authenticate, uploadChat.single('image'), sendImage);

module.exports = router;
