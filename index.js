const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// ===== إعدادات Google Sheets =====
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // ID بتاع الشيت
const SHEET_NAME = "Orders";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function appendOrder(phone, orderText) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:D`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[new Date().toLocaleString("ar-EG"), phone, orderText, "جديد"]],
    },
  });
}

// ===== حالة كل عميل (في الذاكرة - بسيط) =====
const userState = {}; // { phone: "new" | "awaiting_order" }

// ===== رسالة الترحيب =====
const WELCOME_MESSAGE =
  "أهلاً بيك في كنافة وبسبوسة 🍯🧁\n" +
  "اكتب طلبك (الصنف + الكمية) وعنوانك في رسالة واحدة، وهنبدأ نجهزلك الأوردر فورًا.\n\n" +
  "مثال:\n" +
  "كنافة بالقشطة كبيرة + شارع الجامعة، المنصورة";

const THANK_YOU_MESSAGE =
  "تمام يا فندم ✅ تم تسجيل أوردرك وهيتم التواصل معاك لتأكيده والتوصيل قريب.\n" +
  "شكرًا لاختيارك كنافة وبسبوسة 🍯";

// ===== Webhook بتاع Twilio =====
app.post("/whatsapp", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const from = req.body.From; // مثال: whatsapp:+201234567890

  let reply = "";

  if (!userState[from]) {
    // أول رسالة من العميل
    userState[from] = "awaiting_order";
    reply = WELCOME_MESSAGE;
  } else {
    // العميل بعت تفاصيل الأوردر
    try {
      await appendOrder(from, incomingMsg);
      reply = THANK_YOU_MESSAGE;
      userState[from] = "done"; // ممكن تخليه يبدأ من جديد لو حابب
    } catch (err) {
      console.error(err);
      reply = "حصل خطأ في تسجيل الأوردر، من فضلك حاول تاني بعد شوية.";
    }
  }

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

app.get("/", (req, res) => res.send("Konafa Bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
