from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
from datetime import date
import os


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not configured.")

client = genai.Client(api_key=api_key)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
     allow_origins=[
    "http://localhost:5173",
    "https://dealradar-ai-3zf5.onrender.com",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConversationRequest(BaseModel):
    conversation: str


class SalesAnalysis(BaseModel):
    prospect_name: str | None = None
    company_name: str | None = None
    deal_stage: str
    intent: str
    sentiment: str
    objection: str | None = None
    follow_up_required: bool
    follow_up_date: str | None = None
    priority: str
    next_best_action: str


@app.get("/")
def root():
    return {
        "message": "DealRadar AI backend is running"
    }


@app.post("/analyze-conversation")
def analyze_conversation(request: ConversationRequest):

    if not request.conversation.strip():
        raise HTTPException(
            status_code=400,
            detail="Conversation cannot be empty."
        )

    today = date.today().isoformat()

    prompt = f"""
You are DealRadar AI, a strict sales intelligence analyst.

Today's date is {today}.

Analyze the sales conversation below and return ONLY information
supported by the conversation.

Do NOT assume that the prospect is positive, interested, urgent,
or ready to buy unless the conversation provides evidence.

========================
CLASSIFICATION RULES
========================

DEAL STAGE:

Choose exactly one:

New
Qualified
Demo
Evaluation
Negotiation
Closed-Won
Closed-Lost
Unknown

Use the stage explicitly supported by the conversation.

Examples:

- Initial contact / first inquiry -> New
- Prospect has been qualified -> Qualified
- Demo has been requested, scheduled, or completed -> Demo
- Prospect is comparing/testing/evaluating -> Evaluation
- Pricing/contract/final terms are being discussed -> Negotiation
- Deal explicitly won -> Closed-Won
- Deal explicitly rejected/lost -> Closed-Lost
- Insufficient evidence -> Unknown


BUYING INTENT:

Choose exactly one:

High
Medium
Low
Unknown

HIGH:
The prospect clearly wants to buy, move forward, schedule a demo,
request pricing, start implementation, or take a concrete buying step.

MEDIUM:
The prospect shows interest but is uncertain, needs internal
approval, wants more information, or is still evaluating.

LOW:
The prospect shows little interest, is hesitant without meaningful
engagement, delays indefinitely, or indicates that the solution
is not currently a priority.

UNKNOWN:
The conversation does not provide enough evidence.

Do NOT infer High intent simply because the prospect is polite.


SENTIMENT:

Choose exactly one:

Positive
Neutral
Negative
Unknown

POSITIVE:
The prospect expresses clear enthusiasm, satisfaction, excitement,
strong approval, or positive emotional language.

NEUTRAL:
The prospect is factual, professional, uncertain, cautious,
or emotionally ambiguous.

NEGATIVE:
The prospect expresses frustration, dissatisfaction, anger,
disappointment, rejection, or clearly negative language.

UNKNOWN:
There is not enough evidence to determine sentiment.

IMPORTANT:

Interest in a product does NOT automatically mean Positive sentiment.

For example:

"I am interested, but the price is too high."

This may indicate buying intent, but the sentiment can be Neutral
or Negative depending on the wording.

Do NOT automatically return Positive.


OBJECTION:

Return the specific objection only if one is clearly present.

Examples:

- Price
- Budget
- Timing
- Internal approval
- Integration concerns
- Security concerns
- Missing feature

If there is no clear objection, return null.

Never invent an objection.


FOLLOW-UP:

follow_up_required = true ONLY when the conversation clearly
indicates that someone should follow up, continue the discussion,
schedule something, send something, or reconnect.

If no follow-up is required, return false.

If a follow-up date is explicitly mentioned, convert it to
YYYY-MM-DD.

Resolve relative dates such as:

today
tomorrow
Monday
Tuesday
next Friday
next week

using today's date: {today}

If the date cannot be reliably determined, return null.


PRIORITY:

Choose exactly one:

High
Medium
Low

Priority represents the urgency/business importance of following
up. It is NOT the same thing as sentiment or buying intent.

HIGH:
Use only when there is strong evidence of an important or urgent
sales opportunity, an imminent decision, a near-term follow-up,
a serious active deal, or a clear risk of losing a valuable deal.

MEDIUM:
Use when the opportunity is meaningful but there is no strong
evidence of immediate urgency.

LOW:
Use when the opportunity is exploratory, low urgency, vague,
or has little evidence of near-term action.

IMPORTANT:

Do NOT set priority to High merely because buying intent is High.

For example:

"Interested in your product. Let's talk sometime next month."

Intent may be High/Medium depending on evidence, but priority is
not automatically High.

Use the actual urgency expressed in the conversation.


NEXT BEST ACTION:

Give one concise, practical sales action based strictly on the
conversation.

Do not invent information.

========================
OUTPUT REQUIREMENTS
========================

Return structured data matching the provided schema.

Use null where information is unavailable.

Never invent names, companies, dates, objections, urgency,
sentiment, or other facts.

========================
SALES CONVERSATION
========================

{request.conversation}
"""

    try:

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SalesAnalysis,
                temperature=0.1,
            ),
        )

        result = response.parsed

        if result is None:
            raise HTTPException(
                status_code=502,
                detail="AI returned an invalid analysis."
            )

        return result.model_dump()

    except Exception as error:

        error_text = str(error)

        print("Gemini API error:", error_text)

        if (
            "429" in error_text
            or "RESOURCE_EXHAUSTED" in error_text
        ):
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota has been reached. "
                    "Please try again later."
                ),
            )

        if (
            "503" in error_text
            or "UNAVAILABLE" in error_text
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini AI is temporarily unavailable. "
                    "Please try again shortly."
                ),
            )

        raise HTTPException(
            status_code=502,
            detail=(
                "The AI analysis service could not process "
                "the conversation."
            ),
        )
