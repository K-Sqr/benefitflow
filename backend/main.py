import os
import requests
import resend
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS: allow frontend on benefitflow.me and localhost (no "*" when credentials=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.benefitflow.me",
        "https://benefitflow.me",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Configuration
vapi_key = os.getenv("VAPI_SECRET_KEY")
gemini_key = os.getenv("GEMINI_API_KEY")
resend_key = os.getenv("RESEND_API_KEY")

GEMINI_MODEL = "gemini-2.5-flash-lite"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def _gemini_chat(system: str, user: str, *, timeout: int = 30) -> str:
    """Send a chat request to Gemini and return the text response."""
    if not gemini_key:
        raise RuntimeError("GEMINI_API_KEY is not set on the backend.")
    resp = requests.post(
        GEMINI_URL,
        params={"key": gemini_key},
        json={
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": user}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        },
        timeout=timeout,
    )
    data = resp.json()
    if not resp.ok:
        err = data.get("error", {})
        msg = err.get("message", "") if isinstance(err, dict) else str(data)
        raise RuntimeError(f"Gemini API error ({resp.status_code}): {msg}")
    return data["candidates"][0]["content"]["parts"][0]["text"]


class ReportRequest(BaseModel):
    email: str
    callId: str
    language: str = "en"


@app.get("/health")
async def health():
    """Simple health check for CORS/connectivity from the frontend."""
    return {"ok": True}


# Email copy by language (en, es, hi, hmn, so). Keys used when building the HTML.
def _email_translations(lang: str) -> dict:
    # Default to English for unknown codes
    t = _EMAIL_COPY.get(lang) or _EMAIL_COPY["en"]
    return t


_EMAIL_COPY = {
    "en": {
        "subject": "Your MN Benefits Plan: Next Steps & Local Resources",
        "intro": "Based on our conversation, here are your next steps.",
        "need_food_title": "Need Food Today?",
        "need_food_with_zip": "Call the <strong>Minnesota Food HelpLine</strong> at <strong>{food_helpline}</strong> for one-on-one help. They can give you the <strong>3 nearest food shelves for your zip ({zip_code})</strong> and their current hours.",
        "need_food_link": 'You can also search by zip at <a href="{find_food_link}">hungersolutions.org/find-help</a>.',
        "need_food_no_zip": "Call the <strong>Minnesota Food HelpLine</strong> at <strong>{food_helpline}</strong> for one-on-one assistance. They can give you the <strong>3 nearest food shelves</strong> and current hours for your area.",
        "checklist_title": "Your MN-Ready Checklist",
        "checklist_intro": "Gather these so your application goes smoothly:",
        "checklist_photo_note": "<strong>In Minnesota</strong>, you can take photos of these documents with your phone and upload them later. No scanner needed.",
        "ready_to_apply": "Ready to apply?",
        "button_text": "Start Application at MNbenefits.mn.gov",
        "portal_note": "Official all-in-one portal for Minnesota benefits.",
        "what_to_expect_title": "What to Expect",
        "what_1": "<strong>1. After you apply</strong> Minnesota will mail you a letter confirming they got your application. Keep that letter; it has your case number.",
        "what_2": "<strong>2. The phone interview</strong> A <strong>county worker will call you within about 30 days</strong> to review your information. Have your checklist items (pay stubs, ID, lease, etc.) and a list of questions nearby. The call usually takes 15 to 30 minutes. If you miss the call, they may leave a number to call back.",
        "what_3": "<strong>3. After the interview</strong> You will get a decision by mail within 30 days. If approved, you will receive an EBT card to buy groceries. Benefits often start within a few days of approval.",
        "what_4": "<strong>4. Going forward</strong> SNAP is reviewed every 6 or 12 months (you will get a notice). Report changes in income or household size when they happen.",
        "what_5": "If you are denied, the letter will explain why and how to appeal. You are on your way.",
        "signature": "BenefitFlow",
    },
    "es": {
        "subject": "Tu plan de beneficios de MN: próximos pasos y recursos locales",
        "intro": "Según nuestra conversación, aquí están tus próximos pasos.",
        "need_food_title": "¿Necesitas comida hoy?",
        "need_food_with_zip": "Llama a la <strong>Línea de Ayuda de Alimentos de Minnesota</strong> al <strong>{food_helpline}</strong> para ayuda personalizada. Pueden darte las <strong>3 despensas más cercanas para tu código postal ({zip_code})</strong> y su horario actual.",
        "need_food_link": 'También puedes buscar por código postal en <a href="{find_food_link}">hungersolutions.org/find-help</a>.',
        "need_food_no_zip": "Llama a la <strong>Línea de Ayuda de Alimentos de Minnesota</strong> al <strong>{food_helpline}</strong> para ayuda personalizada. Pueden darte las <strong>3 despensas más cercanas</strong> y el horario actual de tu zona.",
        "checklist_title": "Tu lista para MN",
        "checklist_intro": "Reúne esto para que tu solicitud sea más fácil:",
        "checklist_photo_note": "<strong>En Minnesota</strong> puedes tomar fotos de estos documentos con tu teléfono y subirlos después. No necesitas escáner.",
        "ready_to_apply": "¿Listo para aplicar?",
        "button_text": "Comenzar solicitud en MNbenefits.mn.gov",
        "portal_note": "Portal oficial de beneficios de Minnesota.",
        "what_to_expect_title": "Qué esperar",
        "what_1": "<strong>1. Después de aplicar</strong> Minnesota te enviará por correo una carta confirmando que recibieron tu solicitud. Guarda esa carta; tiene tu número de caso.",
        "what_2": "<strong>2. La entrevista por teléfono</strong> Un <strong>trabajador del condado te llamará en unos 30 días</strong> para revisar tu información. Ten a mano tu lista (comprobantes de pago, ID, contrato de alquiler, etc.) y tus preguntas. La llamada suele durar de 15 a 30 minutos. Si pierdes la llamada, pueden dejar un número para devolver la llamada.",
        "what_3": "<strong>3. Después de la entrevista</strong> Recibirás una decisión por correo en 30 días. Si te aprueban, recibirás una tarjeta EBT para comprar alimentos. Los beneficios suelen comenzar a los pocos días de la aprobación.",
        "what_4": "<strong>4. En el futuro</strong> SNAP se revisa cada 6 o 12 meses (recibirás un aviso). Reporta cambios de ingresos o de personas en tu hogar cuando ocurran.",
        "what_5": "Si te niegan, la carta explicará por qué y cómo apelar. Vas por buen camino.",
        "signature": "BenefitFlow",
    },
    "hi": {
        "subject": "आपकी MN लाभ योजना: अगले कदम और स्थानीय संसाधन",
        "intro": "बातचीत के आधार पर, ये रहे आपके अगले कदम।",
        "need_food_title": "आज भोजन चाहिए?",
        "need_food_with_zip": "एक-से-एक मदद के लिए <strong>मिनेसोटा फूड हेल्पलाइन</strong> <strong>{food_helpline}</strong> पर कॉल करें। वे आपको <strong>आपके ज़िप ({zip_code}) के लिए 3 नज़दीकी फूड शेल्फ़</strong> और उनके घंटे बता सकते हैं।",
        "need_food_link": 'आप <a href="{find_food_link}">hungersolutions.org/find-help</a> पर ज़िप से भी खोज सकते हैं।',
        "need_food_no_zip": "<strong>मिनेसोटा फूड हेल्पलाइन</strong> <strong>{food_helpline}</strong> पर कॉल करें। वे आपको <strong>3 नज़दीकी फूड शेल्फ़</strong> और घंटे बता सकते हैं।",
        "checklist_title": "आपकी MN चेकलिस्ट",
        "checklist_intro": "आवेदन आसान रखने के लिए ये चीज़ें इकट्ठा करें:",
        "checklist_photo_note": "<strong>मिनेसोटा में</strong> आप इन दस्तावेज़ों की फोटो फोन से लेकर बाद में अपलोड कर सकते हैं। स्कैनर की ज़रूरत नहीं।",
        "ready_to_apply": "आवेदन के लिए तैयार?",
        "button_text": "MNbenefits.mn.gov पर आवेदन शुरू करें",
        "portal_note": "मिनेसोटा लाभों का आधिकारिक पोर्टल।",
        "what_to_expect_title": "क्या उम्मीद रखें",
        "what_1": "<strong>1. आवेदन के बाद</strong> मिनेसोटा आपको पत्र भेजेगा कि आवेदन मिल गया। वह पत्र रखें; उसमें केस नंबर होता है।",
        "what_2": "<strong>2. फोन इंटरव्यू</strong> लगभग <strong>30 दिनों में काउंटी कर्मचारी कॉल करेगा</strong>। चेकलिस्ट (पे स्टब, ID, लीज़ आदि) और सवालों की सूची रखें। कॉल 15–30 मिनट लगती है। कॉल मिस हो तो वे नंबर छोड़ सकते हैं।",
        "what_3": "<strong>3. इंटरव्यू के बाद</strong> 30 दिनों में डाक से फैसला मिलेगा। मंज़ूरी मिलने पर EBT कार्ड मिलेगा। लाभ अक्सर मंज़ूरी के कुछ दिनों में शुरू हो जाते हैं।",
        "what_4": "<strong>4. आगे</strong> SNAP हर 6 या 12 महीने समीक्षित होता है। आय या घर के सदस्यों में बदलाव हो तो बताएं।",
        "what_5": "अस्वीकृत होने पर पत्र में कारण और अपील का तरीका बताया जाएगा। आप सही रास्ते पर हैं।",
        "signature": "BenefitFlow",
    },
    "hmn": {
        "subject": "Koj MN Benefits Plan: Kauj Ruam Mus thiab Kev Pab Zej Zog",
        "intro": "Raws li peb sib tham, cov kauj ruam mus rau koj.",
        "need_food_title": "Xav noj noj hnub no?",
        "need_food_with_zip": "Hu <strong>Minnesota Food HelpLine</strong> ntawm <strong>{food_helpline}</strong> rau kev pab. Lawv yuav qhia koj <strong>3 qhov food shelf ze taw qhib rau koj zip ({zip_code})</strong> thiab sij hawm.",
        "need_food_link": 'Koj tseem tuaj yeem nrhiav ntawm <a href="{find_food_link}">hungersolutions.org/find-help</a>.',
        "need_food_no_zip": "Hu <strong>Minnesota Food HelpLine</strong> ntawm <strong>{food_helpline}</strong>. Lawv yuav qhia koj <strong>3 qhov food shelf ze</strong> thiab sij hawm.",
        "checklist_title": "Koj MN Checklist",
        "checklist_intro": "Sau cov no kom koj daim ntawv thov yooj yim:",
        "checklist_photo_note": "<strong>Hauv Minnesota</strong> koj ua li cas yeej npaj cov ntaub ntawv no nrog koj phone thiab upload. Tsis muaj scanner.",
        "ready_to_apply": "Sib npaj npaj apply?",
        "button_text": "Pib apply ntawm MNbenefits.mn.gov",
        "portal_note": "Official portal rau Minnesota benefits.",
        "what_to_expect_title": "Koj Txiav Txim",
        "what_1": "<strong>1. Rau qhab apply</strong> Minnesota yuav xa ntawv qhia lawv tau txais. Khaws ntawv; muaj koj case number.",
        "what_2": "<strong>2. Hu phone</strong> <strong>County worker yuav hu koj nyob 30 hnub</strong> los saib koj ntaub ntawv. Muaj checklist (pay stubs, ID, lease) thiab lus nug. Hu feem ntau 15–30 feeb. Yog koj tsis tau hu, lawv yuav tso number.",
        "what_3": "<strong>3. Rau qhab hu</strong> Koj yuav tau txais kev txiav txim nyob 30 hnub. Yog tsim nyog, koj yuav tau EBT card. Benefits pib nyob 2–3 hnub.",
        "what_4": "<strong>4. Mus nap</strong> SNAP xyuas 6 lossis 12 hlis. Xov xov yog muaj hloov income lossis tus neeg hauv tsev.",
        "what_5": "Yog tsis tsim nyog, ntawv yuav qhia vim li cas thiab appeal. Koj mus ncaj ncees.",
        "signature": "BenefitFlow",
    },
    "so": {
        "subject": "Qorshe Faaiidooyinka MN: Talaabooyinka Soo Socda & Adeegyada Deegaanka",
        "intro": "Ku salaysan wada hadalkeena, waa kuwan talaabooyinka soo socda.",
        "need_food_title": "Ma u baahan cunto maanta?",
        "need_food_with_zip": "Wac <strong>Minnesota Food HelpLine</strong> <strong>{food_helpline}</strong> caawinta. Waxay kuu siin karaan <strong>3da bakhaarka cuntada ee ugu dhow zip-kaaga ({zip_code})</strong> iyo saacadaha.",
        "need_food_link": 'Waxaad kaloo ka raadin kartaa <a href="{find_food_link}">hungersolutions.org/find-help</a>.',
        "need_food_no_zip": "Wac <strong>Minnesota Food HelpLine</strong> <strong>{food_helpline}</strong>. Waxay kuu siin karaan <strong>3da bakhaarka cuntada ee ugu dhow</strong> iyo saacadaha.",
        "checklist_title": "Liiska Ku Qalanta MN",
        "checklist_intro": "Ururiyee waxan si codsigaagu u noqdo mid fudud:",
        "checklist_photo_note": "<strong>Minnesota</strong> waxaad sawirkaaga ka qaadan kartaa alaabtan taleefankaaga oo dib u soo gudbiso. Ma u baahan scanner.",
        "ready_to_apply": "Diyaar u noqday inaad codsato?",
        "button_text": "Bilow codsiga MNbenefits.mn.gov",
        "portal_note": "Portalka rasmiga ah ee faaiidooyinka Minnesota.",
        "what_to_expect_title": "Waxaad Sugi Kartaa",
        "what_1": "<strong>1. Ka dib markaad codsato</strong> Minnesota waxay kuu soo diri doonaan warqad xaqiijinaysa inay heleen codsigaaga. Kaydi warqadda; waxaa ku jira lambarkaaga dacwadda.",
        "what_2": "<strong>2. Wareysiga taleefanka</strong> <strong>Shaqaale deegaan ayaa kuu soo wici doona 30 maalmood</strong> si uu uu eego macluumaadkaaga. Yeel alaabta (pay stubs, ID, lease) iyo su'aasha. Wareysigu waxa uu caadi ahaan 15–30 daqiiqo. Hadii aad maqal weydo, waxay kaagi kari waayaan lambar.",
        "what_3": "<strong>3. Ka dib wareysiga</strong> Waxaad heleysaa go'aanka 30 maalmood. Haddii la ansixiyo, waxaad heli doontaa kaadhka EBT. Faaiidooyinku inta badan waxay bilaabmaan maalmo.",
        "what_4": "<strong>4. Mustaqbalka</strong> SNAP waxaa la eegaa 6 ama 12 bilood. Ogeysii beddelka dakhliga ama qofka guriga marka ay dhacaan.",
        "what_5": "Haddii la diido, warqadda waxay sharaxaysaa sababta iyo sida loo raaco. Waad socotaa.",
        "signature": "BenefitFlow",
    },
}

# Full list of documents commonly needed for MN SNAP. We merge conversation-specific items from the LLM with this.
SNAP_CHECKLIST_BASE = [
    "Photo of MN ID or driver's license",
    "Social Security numbers (or cards) for everyone in your household",
    "Proof of income: pay stubs (last 30 days) or employer letter",
    "Proof of other income: unemployment, pension, SSI, SSDI, child support, self-employment",
    "Bank statements (checking and savings, last 30 days)",
    "Rent: lease, rent agreement, or letter from landlord",
    "Utility bills (heating, electric, etc.)",
    "Child care costs: receipts or statement from provider (if you pay for child care)",
    "Medical expenses: bills or statements (if 60+ or disabled and you want to deduct)",
    "Vehicle registration (if you have a car)",
    "Immigration or citizenship documents (if not a U.S. citizen)",
    "Student enrollment or financial aid (if anyone in household is in college)",
]


def analyze_transcript(transcript: str):
    """Extract SNAP data from transcript for the email. Returns JSON string with checklist, zip."""
    system = """You extract SNAP/benefits data from an assistant's transcript (what the AI said during the call). Ignore any user/customer lines; use only the assistant's statements to infer zip and checklist. Return JSON with:
- zip: string (5-digit zip code if mentioned by the assistant, else "")
- checklist: array of ADDITIONAL or specific document names based on what the assistant learned. Examples: if they have a job → "Last 30 days of pay stubs". If they rent → "Lease or rent agreement". If they have bank accounts → "Bank statements (last 30 days)". If they get child support → "Child support documentation". If they have child care costs → "Child care provider statement". If 60+ or disabled → "Medical expense bills". If self-employed → "Self-employment records or tax return". If they have a car → "Vehicle registration". Keep each item under 12 words. Only include items that fit the situation; we will merge with a full standard list.
Return only valid JSON."""
    return _gemini_chat(system, f"Assistant transcript (AI side only):\n{transcript}")


@app.post("/generate-report")
async def generate_report(request: ReportRequest):
    if not (vapi_key and vapi_key.strip()):
        raise HTTPException(
            status_code=503,
            detail="VAPI_SECRET_KEY is not set on the backend. Add it in Railway (or .env) using your Vapi dashboard secret key.",
        )
    try:
        # 1. Get Transcript from Vapi (use secret key, not the public key from the frontend)
        vapi_url = f"https://api.vapi.ai/call/{request.callId}"
        vapi_resp = requests.get(
            vapi_url, headers={"Authorization": f"Bearer {vapi_key}"}
        )
        if vapi_resp.status_code == 401:
            raise HTTPException(
                status_code=502,
                detail="Vapi returned 401 Unauthorized. Set VAPI_SECRET_KEY on Railway to your Vapi secret key (dashboard.vapi.ai → API Keys → Secret Key), not the public key.",
            )
        vapi_resp.raise_for_status()
        call_data = vapi_resp.json()
        # Transcript can be at top level, under artifact, or built from messages
        transcript = (
            call_data.get("transcript")
            or call_data.get("artifact", {}).get("transcript")
            or call_data.get("message", {}).get("transcript", "")
            or ""
        )
        # If transcript has speaker labels, keep only assistant/agent/bot lines (drop user/customer)
        if transcript and isinstance(transcript, str):
            _assistant_prefixes = ("assistant:", "agent:", "bot:", "system:")
            _user_prefixes = ("user:", "customer:", "human:")
            lines = transcript.split("\n")
            assistant_lines = []
            current_is_assistant = None
            for line in lines:
                stripped = line.strip()
                lower = stripped.lower()
                if any(lower.startswith(p) for p in _assistant_prefixes):
                    current_is_assistant = True
                    assistant_lines.append(
                        stripped[stripped.find(":") + 1 :].strip()
                        if ":" in stripped
                        else stripped
                    )
                elif any(lower.startswith(p) for p in _user_prefixes):
                    current_is_assistant = False
                elif current_is_assistant and stripped:
                    assistant_lines.append(stripped)
            if assistant_lines:
                transcript = "\n\n".join(assistant_lines)
        if not transcript and isinstance(call_data.get("messages"), list):
            parts = []
            for m in call_data.get("messages", []):
                role = (m.get("role") or m.get("message", {}).get("role") or "").lower()
                if role not in ("assistant", "bot", "system"):
                    continue
                content = (
                    m.get("message")
                    if isinstance(m.get("message"), str)
                    else (m.get("message") or {}).get("content") or m.get("content", "")
                )
                if content:
                    parts.append(content)
            transcript = "\n\n".join(parts) if parts else ""

        # 2. Extract Data
        import json

        raw_data = analyze_transcript(transcript)
        data = json.loads(raw_data)
        from_llm = data.get("checklist") or []
        zip_code = (data.get("zip") or "").strip()
        # Start with full base checklist, then add any LLM items not already covered
        seen = {s.strip().lower() for s in SNAP_CHECKLIST_BASE}
        checklist = list(SNAP_CHECKLIST_BASE)
        for item in from_llm:
            if item and item.strip().lower() not in seen:
                checklist.append(item.strip())
                seen.add(item.strip().lower())

        # 3. Language and translations
        lang = (request.language or "en").strip().lower() or "en"
        t = _email_translations(lang)

        # Translate checklist to target language when not English
        if lang != "en" and checklist and gemini_key:
            try:
                lang_name = {
                    "es": "Spanish",
                    "hi": "Hindi",
                    "hmn": "Hmong",
                    "so": "Somali",
                }.get(lang, lang)
                raw = _gemini_chat(
                    f"Translate each of the following lines into {lang_name}. Return a JSON object with a single key 'items' whose value is an array of translated strings in the same order. One translation per line.",
                    "\n".join(checklist),
                    timeout=15,
                )
                data_tr = json.loads(raw) if isinstance(raw, str) else raw
                if isinstance(data_tr, dict):
                    translated = data_tr.get("items", data_tr.get("translations"))
                    if isinstance(translated, list) and len(translated) == len(
                        checklist
                    ):
                        checklist = translated
            except Exception:
                pass  # keep checklist in English on failure

        checklist_html = "".join([f"<li>{item}</li>" for item in checklist])
        mn_benefits_url = "https://mnbenefits.mn.gov"
        food_helpline = "1-888-711-1151"
        find_food_link = "https://www.hungersolutions.org/find-help/"

        need_food_body = (
            t["need_food_with_zip"].format(
                food_helpline=food_helpline, zip_code=zip_code
            )
            if zip_code
            else t["need_food_no_zip"].format(food_helpline=food_helpline)
        )
        need_food_link_html = t["need_food_link"].format(find_food_link=find_food_link)
        need_food_section = f"<p>{need_food_body}</p><p>{need_food_link_html}</p>"

        what_to_expect_section = f"""
    <p style="margin: 0 0 0.6em 0; font-size: 0.95rem;">{t['what_1']}</p>
    <p style="margin: 0 0 0.6em 0; font-size: 0.95rem;">{t['what_2']}</p>
    <p style="margin: 0 0 0.6em 0; font-size: 0.95rem;">{t['what_3']}</p>
    <p style="margin: 0 0 0.6em 0; font-size: 0.95rem;">{t['what_4']}</p>
    <p style="margin: 0; font-size: 0.95rem;">{t['what_5']}</p>
"""

        if resend_key:
            resend.api_key = resend_key
        subject = (
            f"✦ {t['subject']}" if not t["subject"].startswith("✦") else t["subject"]
        )
        params = {
            "from": "BenefitFlow <hello@benefitflow.me>",
            "to": [request.email],
            "subject": subject,
            "html": f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #111827; max-width: 560px; padding: 24px;">
  <h1 style="font-size: 1.5rem; color: #1A5D3B; margin-top: 0;">{t['subject']}</h1>
  <p style="margin-bottom: 1.5em;">{t['intro']}</p>

  <section style="background: #F9F8F3; border-radius: 12px; padding: 1rem 1.25rem; margin: 1.5em 0;">
    <h2 style="font-size: 1.1rem; color: #1A5D3B; margin: 0 0 0.5em 0;">{t['need_food_title']}</h2>
    {need_food_section}
  </section>

  <section style="margin: 1.5em 0;">
    <h2 style="font-size: 1.1rem; color: #1A5D3B; margin: 0 0 0.5em 0;">{t['checklist_title']}</h2>
    <p style="margin: 0 0 0.5em 0;">{t['checklist_intro']}</p>
    <ul style="margin: 0.5em 0; padding-left: 1.25rem;">
      {checklist_html}
    </ul>
    <p style="font-size: 0.9rem; color: #4B5563; margin-top: 0.75em;">{t['checklist_photo_note']}</p>
  </section>

  <section style="margin: 1.5em 0; text-align: center;">
    <p style="margin: 0 0 1em 0;"><strong>{t['ready_to_apply']}</strong></p>
    <a href="{mn_benefits_url}" style="display: inline-block; background: #1A5D3B; color: #fff; text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 9999px;">{t['button_text']}</a>
    <p style="font-size: 0.85rem; color: #6B7280; margin-top: 0.75em;">{t['portal_note']}</p>
  </section>

  <section style="border-top: 1px solid #E5E7EB; padding-top: 1em; margin-top: 1.5em;">
    <h2 style="font-size: 1rem; color: #374151; margin: 0 0 0.75em 0;">{t['what_to_expect_title']}</h2>
    {what_to_expect_section}
  </section>

  <p style="font-size: 0.85rem; color: #6B7280; margin-top: 1.5em;">{t['signature']}</p>
</body>
</html>
            """.strip(),
        }
        resend.Emails.send(params)
        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
