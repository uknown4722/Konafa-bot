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

const userState = {};

const WELCOME_MESSAGE =
  "أهلاً بيك في كنافة وبسبوسة 🍯🧁\n" +
  "اكتب طلبك (الصنف + الكمية) وعنوانك في رسالة واحدة، وهنبدأ نجهزلك الأوردر فورًا.\n\n" +
  "مثال:\n" +
  "كنافة بالقشطة كبيرة + شارع الجامعة، المنصورة";

const THANK_YOU_MESSAGE =
  "تمام يا فندم ✅ تم تسجيل أوردرك وهيتم التواصل معاك لتأكيده والتوصيل قريب.\n" +
  "شكرًا لاختيارك كنافة وبسبوسة 🍯";

app.post("/whatsapp", async (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const from = req.body.From;

  let reply = "";

  if (!userState[from]) {
    userState[from] = "awaiting_order";
    reply = WELCOME_MESSAGE;
  } else {
    try {
      await saveOrder(from, incomingMsg);
      reply = THANK_YOU_MESSAGE;
      userState[from] = "done";
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
بعد اللصق، دوس Commit changes تحت. Render هيعمل Deploy تلقائي من جديد. قولي لما يخلص ✅
        .cc-install-nudge { container-type: inline-size; }
        @keyframes ccInstallNudgeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @container (max-width: 450px) {
          .cc-install-nudge-icon { display: none; }
        }
      Claude works directly with your codebaseLet Claude edit files, run commands, and ship changes from the desktop app, your terminal, or your IDE.Install
