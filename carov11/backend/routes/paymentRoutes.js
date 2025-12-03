const express = require('express');
const router = express.Router();
router.post('/create-link', (req, res) => {
  res.json({ success: true, link: `https://fake-pay.com/${req.body.orderId}` });
});
module.exports = router;
