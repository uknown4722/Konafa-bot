const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// رابط Google Apps Script
const SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxV8m__V7sGVIuCOKqt8ARatwTa8iLc2gfUfNfCT7tuXs8spxMJAkof5ZVks9E5bmM5/exec";

async function saveOrder(phone, orderText, total) {
  await fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, order: `${orderText} | الإجمالي: ${total} ج.م` }),
  });
}

// ===== الأسعار =====
const PRICES = {
  "كنافة-صغير": 50,
  "كنافة-كبير": 80,
  "بسبوسة-صغير": 50,
  "بسبوسة-كبير": 80,
};

const MENU_MESSAGE =
  "📋 المنيو:\n" +
  "🟡 كنافة صغير: 50 ج.م\n" +
  "🟡 كنافة كبير: 80 ج.م\n" +
  "🟤 بسبوسة صغير: 50 ج.م\n" +
  "🟤 بسبوسة كبير: 80 ج.م\n\n" +
  "لو حابب تتكلم مع موظف في أي وقت، اكتب \"موظف\".";

const WELCOME_MESSAGE =
  "أهلاً بيك في كنافة وبسبوسة 🍯🧁\n\n" + MENU_MESSAGE;

const HUMAN_REQUEST_MESSAGE =
  "تمام، تم تحويلك لأحد فريقنا وهيتواصل معاك في أقرب وقت 🙏\n" +
  "لو عايز ترجع تكمل مع البوت، اكتب \"رجوع\".";

const HUMAN_ACTIVE_MESSAGE =
  "طلبك لسه عند فريقنا وهيتم الرد عليك قريب 🙏\n" +
  "(اكتب \"رجوع\" لو حابب تكمل مع البوت).";

const BACK_TO_BOT_MESSAGE = "تمام، رجعت تاني للبوت 👍\n" + MENU_MESSAGE;

const THANKS_MESSAGE = "العفو، تحت أمرك في أي وقت 🌟";

const FINAL_THANK_YOU =
  "تم تأكيد طلبك بنجاح ✅ وهيتم التواصل معاك لتأكيد التوصيل قريب.\n" +
  "شكرًا لتواصلك معنا، أتمنى لك كنافة لذيذة 🍯😋";

const CANCEL_MESSAGE =
  "تم إلغاء الطلب لعدم التأكيد في الوقت المحدد ⏱️\n" +
  "لو حابب تطلب تاني، اكتب طلبك من جديد.";

const NOT_UNDERSTOOD_MESSAGE =
  "معلش، مش قادر أفهم طلبك 🙏\n\n" + MENU_MESSAGE;

const CONFIRM_KEYWORDS = ["تاكيد", "تأكيد", "اوكي", "أوكي", "تمام", "اكد", "أكد", "yes", "ok", "confirm", "موافق"];
const HUMAN_KEYWORDS = ["موظف", "ممثل", "انسان", "إنسان", "حد يرد", "اتكلم مع حد", "خدمة عملاء", "human", "agent"];
const BACK_KEYWORDS = ["رجوع", "back", "بوت", "رجعني"];
const THANKS_KEYWORDS = ["شكرا", "شكراً", "متشكر", "تسلم", "ثانكس", "thanks", "thank you"];
const GREETING_KEYWORDS = ["سلام", "السلام عليكم", "اهلا", "أهلا", "هاي", "hi", "hello"];

const CONFIRMATION_TIMEOUT_MS = 60 * 1000; // دقيقة واحدة

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
function parseOrder(rawText) {
  const text = normalizeDigits(rawText);
  let remaining = text;
  const items = [];
  let total = 0;

  const itemDefs = [
    { key: "كنافة-كبير", regex: /(\d+)?\s*كناف[ةه]\s*كبير[ةه]?\s*(\d+)?/g, label: "كنافة كبير" },
    { key: "كنافة-صغير", regex: /(\d+)?\s*كناف[ةه]\s*صغير[ةه]?\s*(\d+)?/g, label: "كنافة صغير" },
    { key: "بسبوسة-كبير", regex: /(\d+)?\s*بسبوس[ةه]\s*كبير[ةه]?\s*(\d+)?/g, label: "بسبوسة كبير" },
    { key: "بسبوسة-صغير", regex: /(\d+)?\s*بسبوس[ةه]\s*صغير[ةه]?\s*(\d+)?/g, label: "بسبوسة صغير" },
  ];

  for (const def of itemDefs) {
    let match;
    while ((match = def.regex.exec(text)) !== null) {
      const qty = parseInt(match[1] || match[2] || "1", 10);
      const price = PRICES[def.key];
      items.push({ label: def.label, qty, price, lineTotal: qty * price });
      total += qty * price;
      remaining = remaining.replace(match[0], " ");
    }
  }

  // الباقي من النص يعتبر العنوان (بعد تنظيفه من رموز زيادة)
  let address = remaining
    .replace(/[+\-،,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { items, total, address };
}

function buildOrderSummary(items, total, address) {
  let summary = "🧾 ملخص الطلب:\n";
  for (const item of items) {
    summary += `- ${item.label} × ${item.qty} = ${item.lineTotal} ج.م\n`;
  }
  summary += `\n📍 العنوان: ${address || "غير محدد"}\n`;
  summary += `💰 الإجمالي: ${total} ج.م\n\n`;
  summary += 'لتأكيد الطلب اكتب "تأكيد" خلال دقيقة، أو هيتم إلغاء الطلب تلقائيًا.';
  return summary;
}

// ===== حالة كل عميل =====
// state: "awaiting_order" | "awaiting_confirmation" | "done" | "human"
const userState = {};
const pendingOrders = {}; // { phone: { orderText, total, address, timestamp } }

// ===== Webhook بتاع Twilio =====
app.post("/whatsapp", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const from = req.body.From;

  let reply = "";
  const currentState = userState[from];

  // 0) التحقق من تايم آوت التأكيد
  if (currentState === "awaiting_confirmation" && pendingOrders[from]) {
    const elapsed = Date.now() - pendingOrders[from].timestamp;
    if (elapsed > CONFIRMATION_TIMEOUT_MS) {
      delete pendingOrders[from];
      userState[from] = "awaiting_order";
      // نكمل معالجة الرسالة الجديدة بشكل عادي بعد الإلغاء
      reply = CANCEL_MESSAGE + "\n\n" + MENU_MESSAGE;
      res.set("Content-Type", "text/xml");
      return res.send(`<Response><Message>${reply}</Message></Response>`);
    }
  }

  // 1) طلب موظف - override في أي وقت
  if (containsAny(incomingMsg, HUMAN_KEYWORDS)) {
    userState[from] = "human";
    delete pendingOrders[from];
    reply = HUMAN_REQUEST_MESSAGE;
  }
  // 2) وضع human
  else if (currentState === "human") {
    if (containsAny(incomingMsg, BACK_KEYWORDS)) {
      userState[from] = "awaiting_order";
      reply = BACK_TO_BOT_MESSAGE;
    } else {
      reply = HUMAN_ACTIVE_MESSAGE;
    }
  }
  // 3) شكر
  else if (containsAny(incomingMsg, THANKS_KEYWORDS)) {
    reply = THANKS_MESSAGE;
  }
  // 4) في انتظار التأكيد
  else if (currentState === "awaiting_confirmation") {
    if (containsAny(incomingMsg, CONFIRM_KEYWORDS)) {
      const order = pendingOrders[from];
      try {
        const orderLine = order.items
          .map((i) => `${i.label} x${i.qty}`)
          .join(", ") + ` | العنوان: ${order.address}`;
        await saveOrder(from, orderLine, order.total);
        reply = FINAL_THANK_YOU;
        userState[from] = "done";
        delete pendingOrders[from];
      } catch (err) {
        console.error(err);
        reply = "حصل خطأ في تسجيل الأوردر، من فضلك حاول تاني بعد شوية.";
      }
    } else {
      reply = 'لسه في انتظار تأكيدك 🙏 اكتب "تأكيد" عشان نسجل الطلب.';
    }
  }
  // 5) أول رسالة من العميل
  else if (!currentState) {
    userState[from] = "awaiting_order";
    reply = WELCOME_MESSAGE;
  }
  // 6) استلام الطلب وحساب السعر
  else {
    const { items, total, address } = parseOrder(incomingMsg);

    if (items.length === 0) {
      reply = NOT_UNDERSTOOD_MESSAGE;
    } else {
      pendingOrders[from] = { items, total, address, timestamp: Date.now() };
      userState[from] = "awaiting_confirmation";
      reply = buildOrderSummary(items, total, address);
    }
  }

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

app.get("/", (req, res) => res.send("Konafa Bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
