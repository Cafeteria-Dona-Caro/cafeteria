const express = require('express');
const router = express.Router();
const { processUserMessage } = require('../services/botLogic');
router.get('/', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) { res.status(200).send(req.query['hub.challenge']); } else { res.sendStatus(403); }
});
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (body.object && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const name = body.entry[0].changes[0].value.contacts[0].profile.name;
      processUserMessage(msg.from, msg, name);
    }
    res.sendStatus(200);
  } catch (e) { console.error(e); res.sendStatus(500); }
});
module.exports = router;
