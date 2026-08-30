# DealRadar AI

## Problem

Sales representatives can miss important follow-ups because valuable information from sales conversations, meetings, and emails is difficult to organize and track.

DealRadar AI converts unstructured sales conversations into structured sales intelligence and helps sales representatives identify what to do next.

---

## Target Users

- Sales representatives
- Sales teams
- Business development teams
- Account executives

---

## MVP

The current MVP focuses on:

1. Analyze sales conversations
2. Detect buying intent
3. Identify sentiment
4. Determine deal stage
5. Identify objections
6. Assign deal priority
7. Detect follow-up requirements
8. Identify follow-up dates
9. Recommend the next best action
10. Store conversation analysis history
11. Search analyzed conversations
12. Filter conversations
13. Sort conversations
14. Add follow-ups to Google Calendar

---

## Core Screens

### Sales Conversation Input

Users can paste:

- Sales call transcripts
- Meeting notes
- Email conversations
- Other sales conversation text

### Sales Intelligence Dashboard

Displays:

- Prospect
- Company
- Deal stage
- Buying intent
- Sentiment
- Objection
- Priority
- Follow-up status
- Follow-up date
- Next best action

### Conversation History

Previously analyzed conversations remain available in browser storage and can be searched, filtered, sorted, and expanded to view the original conversation.

### Follow-up Radar

Displays upcoming follow-ups and places the nearest follow-up first.

---

## AI Analysis Output

The backend returns structured sales intelligence containing:

- `prospect_name`
- `company_name`
- `deal_stage`
- `intent`
- `sentiment`
- `objection`
- `follow_up_required`
- `follow_up_date`
- `priority`
- `next_best_action`

### Allowed Values

#### Intent

- High
- Medium
- Low
- Unknown

#### Sentiment

- Positive
- Neutral
- Negative
- Unknown

#### Priority

- High
- Medium
- Low

#### Deal Stage

- New
- Qualified
- Demo
- Evaluation
- Negotiation
- Closed-Won
- Closed-Lost
- Unknown

---

## API Contract

### POST `/analyze-conversation`

Analyzes a sales conversation using the AI backend.

#### Request

```json
{
  "conversation": "sales conversation text"
}