\# DealRadar AI



\## Problem



Sales representatives miss important follow-ups

because conversations, emails, and meeting information

are difficult to track.



\## Target User



Sales representatives and sales teams.



\## MVP



1\. Analyze sales conversations

2\. Detect follow-up requirements

3\. Extract important deal information

4\. Prioritize follow-ups

5\. Recommend next-best action

6\. Generate personalized follow-up messages



\## Core Screens



1\. Dashboard

2\. Deal Analysis

3\. Follow-up Composer



\## AI Output



\- Prospect

\- Company

\- Deal stage

\- Intent

\- Sentiment

\- Objection

\- Follow-up required

\- Follow-up date

\- Next best action

\- Urgency

\- Follow-up message



\## Demo Story



Conversation → AI Analysis → Priority → Next Action → Message



\## Tech Stack



Frontend: React + Vite

Backend: FastAPI

AI: LLM API

Database: SQLite

UI: Tailwind CSS + shadcn/ui





\## AI Analysis Output



The AI analyzes a sales conversation and returns:



\- prospect\_name

\- company\_name

\- deal\_stage

\- intent

\- sentiment

\- objection

\- follow\_up\_required

\- follow\_up\_date

\- priority

\- next\_best\_action



\### Allowed Values



Intent:

\- High

\- Medium

\- Low

\- Unknown



Sentiment:

\- Positive

\- Neutral

\- Negative

\- Unknown



Priority:

\- High

\- Medium

\- Low



Deal Stage:

\- New

\- Qualified

\- Demo

\- Evaluation

\- Negotiation

\- Closed-Won

\- Closed-Lost

\- Unknown



\## API Contract



\### POST /analyze-conversation



Request:



{

&#x20; "conversation": "sales conversation text"

}



Response:



{

&#x20; "prospect\_name": "Rahul",

&#x20; "company\_name": null,

&#x20; "deal\_stage": "Evaluation",

&#x20; "intent": "High",

&#x20; "sentiment": "Positive",

&#x20; "objection": "Pricing",

&#x20; "follow\_up\_required": true,

&#x20; "follow\_up\_date": "Tuesday",

&#x20; "priority": "High",

&#x20; "next\_best\_action": "Send enterprise pricing details"

}



\### POST /generate-follow-up



Request:



{

&#x20; "conversation": "sales conversation text",

&#x20; "analysis": {}

}



Response:



{

&#x20; "subject": "Enterprise Pricing Details",

&#x20; "message": "Personalized follow-up message"

}

