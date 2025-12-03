require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { initializeFirebase } = require('./config/firebase');
const webhookRoutes = require('./routes/webhookRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

initializeFirebase();
app.use(bodyParser.json());
app.use('/webhook', webhookRoutes);
app.use('/payments', paymentRoutes);

app.get('/', (req, res) => res.status(200).send('WA Orchestrator Online 🚀'));
app.listen(PORT, () => console.log(`🤖 Orquestador escuchando en el puerto ${PORT}`));
