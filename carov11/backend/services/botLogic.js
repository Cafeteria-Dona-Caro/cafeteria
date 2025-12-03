const axios = require('axios');
const { getDb, admin } = require('../config/firebase');
const WA_TOKEN = process.env.WHATSAPP_TOKEN; 
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID; 
const BRANCH_ID = "cafecaro-centro"; 

async function sendWhatsAppMessage(to, type, content) {
  const url = `https://graph.facebook.com/v17.0/${WA_PHONE_ID}/messages`;
  let body = { messaging_product: "whatsapp", to: to, type: type };
  if (type === 'text') body.text = { body: content };
  if (type === 'interactive') body.interactive = content;
  try { await axios.post(url, body, { headers: { Authorization: `Bearer ${WA_TOKEN}` } }); } 
  catch (error) { console.error("WA Error:", error.response?.data || error.message); }
}

async function processUserMessage(phone, messageBody, userName) {
  const db = getDb();
  const cartRef = db.collection('whatsapp_carts').doc(phone);
  let cartSnap = await cartRef.get();
  
  if (!cartSnap.exists) {
    await cartRef.set({ phone, userName, step: 'WELCOME', items: [], updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    cartSnap = await cartRef.get();
  }
  const cart = cartSnap.data();

  try {
    const text = messageBody.text?.body?.toLowerCase();
    
    if (text === 'hola' || text === 'menu') {
      await sendMainMenu(phone);
      await cartRef.update({ step: 'MENU_SELECTION' });
      return;
    }

    if (cart.step === 'MENU_SELECTION') {
      const selId = messageBody.interactive?.list_reply?.id;
      if (selId) {
        await cartRef.update({ tempProductId: selId, step: 'QUANTITY' });
        await sendWhatsAppMessage(phone, 'text', '¿Cuántas unidades deseas?');
      }
    }
    else if (cart.step === 'QUANTITY') {
      const qty = parseInt(text);
      if (!isNaN(qty) && qty > 0) {
        const pSnap = await db.collection('branches').doc(BRANCH_ID).collection('products').doc(cart.tempProductId).get();
        if(pSnap.exists) {
            const p = pSnap.data();
            const newItem = { sku: pSnap.id, name: p.name, quantity: qty, unitPrice: p.price, subtotal: p.price * qty };
            const newItems = [...cart.items, newItem];
            await cartRef.update({ items: newItems, step: 'CART_VIEW', tempProductId: admin.firestore.FieldValue.delete() });
            await sendCartSummary(phone, newItems);
        }
      }
    }
    else if (cart.step === 'CART_VIEW') {
        const act = messageBody.interactive?.button_reply?.id;
        if (act === 'ADD') { await sendMainMenu(phone); await cartRef.update({ step: 'MENU_SELECTION' }); }
        if (act === 'CONFIRM') { await sendPaymentOptions(phone); await cartRef.update({ step: 'PAYMENT' }); }
    }
    else if (cart.step === 'PAYMENT') {
        const method = messageBody.interactive?.button_reply?.id; 
        await finalizeOrder(phone, cart, method === 'LINK' ? 'card' : 'cash');
    }
  } catch (error) { console.error(error); await sendWhatsAppMessage(phone, 'text', 'Error en el sistema.'); }
}

async function sendMainMenu(phone) {
    const msg = { type: "list", header: { type: "text", text: "Menú Café Caro" }, body: { text: "Elige una opción:" }, footer: { text: "Catálogo" }, action: { button: "Ver Menú", sections: [ { title: "Bebidas", rows: [ { id: "prod_cappuccino", title: "Cappuccino", description: "$60" }, { id: "prod_frappe", title: "Frappe Oreo", description: "$65" } ] } ] } };
    await sendWhatsAppMessage(phone, 'interactive', msg);
}

async function sendCartSummary(phone, items) {
    let t = 0; let txt = "*Tu Carrito:*\n";
    items.forEach(i => { txt += `${i.quantity}x ${i.name} - $${i.subtotal}\n`; t += i.subtotal; });
    txt += `\n*Total: $${t}*`;
    const btn = { type: "button", body: { text: txt }, action: { buttons: [ { type: "reply", reply: { id: "ADD", title: "Agregar más" } }, { type: "reply", reply: { id: "CONFIRM", title: "Confirmar" } } ] } };
    await sendWhatsAppMessage(phone, 'interactive', btn);
}

async function sendPaymentOptions(phone) {
    const btn = { type: "button", body: { text: "Método de Pago" }, action: { buttons: [ { type: "reply", reply: { id: "CASH", title: "Efectivo" } }, { type: "reply", reply: { id: "LINK", title: "Pago en Línea" } } ] } };
    await sendWhatsAppMessage(phone, 'interactive', btn);
}

async function finalizeOrder(phone, cart, method) {
    const db = getDb();
    const total = cart.items.reduce((s, i) => s + i.subtotal, 0);
    const orderData = {
        source: "whatsapp", channel: "delivery", status: "pending", tableNumber: null, customerName: cart.userName || "Cliente WA", customerId: phone, deliveryAddress: "Dirección pendiente (Chat)", deliveryPhone: phone, items: cart.items.map(i => ({ id: i.sku, name: i.name, quantity: i.quantity, price: i.unitPrice, notes: "Vía WhatsApp" })), total: total, paymentMethod: method, invoiceRequired: false, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('branches').doc(BRANCH_ID).collection('orders').add(orderData);
    await db.collection('whatsapp_carts').doc(phone).delete();
    await sendWhatsAppMessage(phone, 'text', `✅ ¡Pedido #${ref.id.slice(0,5)} confirmado!\nTotal: $${total}\nEnviando a cocina.`);
}
module.exports = { processUserMessage };
