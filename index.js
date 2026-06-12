const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// رابط Google Apps Script
const SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxV8m__V7sGVIuCOKqt8ARatwTa8iLc2gfUfNfCT7tuXs8spxMJAkof5ZVks9E5bmM5/exec";

async function saveOrder(phone, orderText) {
  await fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, order: orderText }),
  });
}

// ===== الأسعار =====
const PRICES = {
  "كنافة-صغير": 50,
  "كنافة-كبير": 80,
  "بسبوسة-صغير": 50,
  "بسبوسة-كبير": 80,
};

const ITEM_LABELS = {
  "كنافة-صغير": "كنافة صغير",
  "كنافة-كبير": "كنافة كبير",
  "بسبوسة-صغير": "بسبوسة صغير",
  "بسبوسة-كبير": "بسبوسة كبير",
};

const MENU_MESSAGE =
  "📋 المنيو:\n" +
  "🟡 كنافة صغير: 50 ج.م\n" +
  "🟡 كنافة كبير: 80 ج.م\n" +
  "🟤 بسبوسة صغير: 50 ج.م\n" +
  "🟤 بسبوسة كبير: 80 ج.م\n\n" +
  "اكتب طلبك (مثال: 3 كنافة كبير و 2 بسبوسة صغير).\n" +
  "لو حابب تتكلم مع موظف في أي وقت، اكتب \"موظف\".";

const GREETING_REPLY = "وعليكم السلام ورحمة الله وبركاته 🌿";

const WELCOME_MESSAGE = "أهلاً بيك في كنافة وبسبوسة 🍯🧁\n\n" + MENU_MESSAGE;

const HUMAN_REQUEST_MESSAGE =
  "تمام، تم تحويلك لأحد فريقنا وهيتواصل معاك في أقرب وقت 🙏\n" +
  "لو عايز ترجع تكمل مع البوت، اكتب \"رجوع\".";

const HUMAN_ACTIVE_MESSAGE =
  "طلبك لسه عند فريقنا وهيتم الرد عليك قريب 🙏\n" +
  "(اكتب \"رجوع\" لو حابب تكمل مع البوت).";

const BACK_TO_BOT_MESSAGE = "تمام، رجعت تاني للبوت 👍\n\n" + MENU_MESSAGE;

const THANKS_MESSAGE = "العفو، تحت أمرك في أي وقت 🌟";

const ASK_ADDRESS_MESSAGE = "تمام يا فندم ✅\nممكن العنوان؟";

const FINAL_MESSAGE =
  "تمام يا فندم، تم حجز الطلب ✅\n" +
  "وفي خلال 40 لـ 60 دقيقة هيكون الطلب عند حضرتك.\n" +
  "نورتنا يا فندم 🌟";

const CONFIRM_KEYWORDS = ["تاكيد", "تأكيد", "اكد", "أكد", "ناكد", "نأكد", "اوكي", "أوكي", "تمام", "yes", "ok", "confirm", "موافق"];
const HUMAN_KEYWORDS = ["موظف", "ممثل", "انسان", "إنسان", "حد يرد", "اتكلم مع حد", "خدمة عملاء", "human", "agent"];
const BACK_KEYWORDS = ["رجوع", "back", "بوت", "رجعني"];
const THANKS_KEYWORDS = ["شكرا", "شكراً", "متشكر", "تسلم", "ثانكس", "thanks", "thank you"];
const GREETING_KEYWORDS = ["سلام", "السلام عليكم", "اهلا", "أهلا", "هاي", "hi", "hello"];

function containsAny(text, list) {
  const lower = text.toLowerCase();
  return list.some((word) => lower.includes(word.toLowerCase()));
}

// تحويل أرقام عربية لإنجليزية
function normalizeDigits(text) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
}

// ===== تحليل الطلب من النص =====
// يدعم: "3 كنافة كبير"، "كنافة كبير 3"، "كبير 3" (يكمل على آخر منتج مذكور)
function parseOrderItems(rawText) {
  const text = normalizeDigits(rawText);
  const regex = /(\d+)?\s*(كناف[ةه]|بسبوس[ةه])?\s*(صغير[ةه]?|كبير[ةه]?)\s*(\d+)?/g;

  const items = [];
  let lastItemName = "كنافة"; // افتراضي
  let match;

  while ((match = regex.exec(text)) !== null) {
    const qtyBefore = match[1];
    const itemNameRaw = match[2];
    const sizeRaw = match[3];
    const qtyAfter = match[4];

    if (!sizeRaw) continue;

    const qty = parseInt(qtyBefore || qtyAfter || "1", 10);
    const size = sizeRaw.startsWith("صغير") ? "صغير" : "كبير";

    let itemName;
    if (itemNameRaw) {
      itemName = itemNameRaw.startsWith("كناف") ? "كنافة" : "بسبوسة";
      lastItemName = itemName;
    } else {
      itemName = lastItemName;
    }

    const key = `${itemName}-${size}`;
    const price = PRICES[key];
    if (!price) continue;

    items.push({ key, qty, price, lineTotal: qty * price });
  }

  return items;
}

function mergeItems(existingItems, newItems) {
  const merged = [...existingItems];
  for (const newItem of newItems) {
    const found = merged.find((i) => i.key === newItem.key);
    if (found) {
      found.qty += newItem.qty;
      found.lineTotal += newItem.lineTotal;
    } else {
      merged.push({ ...newItem });
    }
  }
  return merged;
}

function calcTotal(items) {
  return items.reduce((sum, i) => sum + i.lineTotal, 0);
}

function buildItemsSummary(items) {
  return items
    .map((i) => `- ${ITEM_LABELS[i.key]} × ${i.qty} = ${i.lineTotal} ج.م`)
    .join("\n");
}

function buildOrderLineForSheet(items, address) {
  const itemsText = items.map((i) => `${ITEM_LABELS[i.key]} x${i.qty}`).join(", ");
  return `${itemsText} | الإجمالي: ${calcTotal(items)} ج.م | العنوان: ${address}`;
}

// ===== حالة كل عميل =====
// state: "new" | "ordering" | "awaiting_address" | "done" | "human"
const userState = {};
const pendingOrders = {}; // { phone: { items: [] } }

// ===== Webhook بتاع Twilio =====
app.post("/whatsapp", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const from = req.body.From;

  let reply = "";
  const currentState = userState[from];

  // 1) طلب موظف - override في أي وقت
  if (containsAny(incomingMsg, HUMAN_KEYWORDS)) {
    userState[from] = "human";
    delete pendingOrders[from];
    reply = HUMAN_REQUEST_MESSAGE;
  }
  // 2) وضع human
  else if (currentState === "human") {
    if (containsAny(incomingMsg, BACK_KEYWORDS)) {
      userState[from] = "new";
      reply = BACK_TO_BOT_MESSAGE;
    } else {
      reply = HUMAN_ACTIVE_MESSAGE;
    }
  }
  // 3) شكر
  else if (containsAny(incomingMsg, THANKS_KEYWORDS)) {
    reply = THANKS_MESSAGE;
  }
  // 4) أول رسالة أو ترحيب
  else if (!currentState || currentState === "new") {
    userState[from] = "ordering";
    pendingOrders[from] = { items: [] };
    if (containsAny(incomingMsg, GREETING_KEYWORDS)) {
      reply = GREETING_REPLY + "\n" + WELCOME_MESSAGE;
    } else {
      reply = WELCOME_MESSAGE;
    }
  }
  // 5) في مرحلة بناء الطلب
  else if (currentState === "ordering") {
    if (containsAny(incomingMsg, CONFIRM_KEYWORDS)) {
      const order = pendingOrders[from];
      if (!order || order.items.length === 0) {
        reply = "لسه معندناش طلب مسجل 🙏\n\n" + MENU_MESSAGE;
      } else {
        userState[from] = "awaiting_address";
        reply = ASK_ADDRESS_MESSAGE;
      }
    } else {
      const newItems = parseOrderItems(incomingMsg);
      if (newItems.length === 0) {
        reply = "معلش، مش قادر أفهم طلبك 🙏\n\n" + MENU_MESSAGE;
      } else {
        const order = pendingOrders[from] || { items: [] };
        order.items = mergeItems(order.items, newItems);
        pendingOrders[from] = order;

        const total = calcTotal(order.items);
        reply =
          buildItemsSummary(order.items) +
          `\n\n💰 الإجمالي: ${total} ج.م\n\n` +
          'تحب تضيف حاجة تانية ولا نأكد الطلب على كده؟ (اكتب "تأكيد" للتأكيد)';
      }
    }
  }
  // 6) في انتظار العنوان
  else if (currentState === "awaiting_address") {
    const order = pendingOrders[from];
    const address = incomingMsg;
    try {
      await saveOrder(from, buildOrderLineForSheet(order.items, address));
      reply = FINAL_MESSAGE;
      userState[from] = "done";
      delete pendingOrders[from];
    } catch (err) {
      console.error(err);
      reply = "حصل خطأ في تسجيل الأوردر، من فضلك حاول تاني بعد شوية.";
    }
  }
  // 7) بعد انتهاء الطلب - يبدأ طلب جديد
  else if (currentState === "done") {
    userState[from] = "ordering";
    pendingOrders[from] = { items: [] };
    if (containsAny(incomingMsg, GREETING_KEYWORDS)) {
      reply = GREETING_REPLY + "\n" + WELCOME_MESSAGE;
    } else {
      const newItems = parseOrderItems(incomingMsg);
      if (newItems.length === 0) {
        reply = WELCOME_MESSAGE;
        pendingOrders[from] = { items: [] };
      } else {
        pendingOrders[from] = { items: newItems };
        const total = calcTotal(newItems);
        reply =
          buildItemsSummary(newItems) +
          `\n\n💰 الإجمالي: ${total} ج.م\n\n` +
          'تحب تضيف حاجة تانية ولا نأكد الطلب على كده؟ (اكتب "تأكيد" للتأكيد)';
      }
    }
  }

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

app.get("/", (req, res) => res.send("Konafa Bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
