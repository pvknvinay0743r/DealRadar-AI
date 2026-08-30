import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEY = "dealradar_conversations";

function parseFollowUpDate(dateText) {
  if (!dateText) return null;

  const match = String(dateText)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getFollowUpDateValue(dateText) {
  const date = parseFollowUpDate(dateText);

  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function formatDate(dateText) {
  const date = parseFollowUpDate(dateText);

  if (!date) {
    return dateText || "Date not specified";
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCalendarDate(dateText) {
  const date = parseFollowUpDate(dateText);

  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

/*
 * Add follow-up to Google Calendar.
 *
 * Google Calendar uses an exclusive end date for all-day events,
 * so the end date is one day after the follow-up date.
 */
function addToCalendar(analysis) {
  if (!analysis?.follow_up_date) {
    window.alert(
      "No valid follow-up date is available for this conversation."
    );

    return;
  }

  const startDate = parseFollowUpDate(
    analysis.follow_up_date
  );

  if (!startDate) {
    window.alert(
      "The follow-up date is not in a valid YYYY-MM-DD format."
    );

    return;
  }

  const endDate = new Date(startDate);

  endDate.setDate(endDate.getDate() + 1);

  const start = getCalendarDate(
    analysis.follow_up_date
  );

  const endYear = endDate.getFullYear();
  const endMonth = String(
    endDate.getMonth() + 1
  ).padStart(2, "0");
  const endDay = String(
    endDate.getDate()
  ).padStart(2, "0");

  const end = `${endYear}${endMonth}${endDay}`;

  const prospect =
    analysis.prospect_name ||
    "Sales Prospect";

  const company =
    analysis.company_name ||
    "Unknown Company";

  const action =
    analysis.next_best_action ||
    "Follow up with prospect";

  const priority =
    analysis.priority ||
    "Unknown";

  const intent =
    analysis.intent ||
    "Unknown";

  const stage =
    analysis.deal_stage ||
    "Unknown";

  const sentiment =
    analysis.sentiment ||
    "Unknown";

  const title = `DealRadar Follow-up - ${prospect}`;

  const details = [
    `Prospect: ${prospect}`,
    `Company: ${company}`,
    `Priority: ${priority}`,
    `Buying Intent: ${intent}`,
    `Deal Stage: ${stage}`,
    `Sentiment: ${sentiment}`,
    "",
    "Next Best Action:",
    action,
    "",
    "Created by DealRadar AI",
  ].join("\n");

  const calendarUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${start}/${end}` +
    `&details=${encodeURIComponent(details)}`;

  window.open(
    calendarUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

function App() {
  const [conversation, setConversation] = useState("");

  const [analyses, setAnalyses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return [];

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(
        "Could not restore conversation history:",
        error
      );

      return [];
    }
  });

  const [loading, setLoading] = useState(false);

  const [showInput, setShowInput] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        return (
          !Array.isArray(parsed) ||
          parsed.length === 0
        );
      }

      return true;
    } catch {
      return true;
    }
  });

  const [filterType, setFilterType] = useState("all");
  const [filterValue, setFilterValue] = useState("all");

  const [sortOrder, setSortOrder] =
    useState("upcoming");

  const [searchQuery, setSearchQuery] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [expandedConversations, setExpandedConversations] =
    useState({});

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(analyses)
      );
    } catch (error) {
      console.error(
        "Could not save conversation history:",
        error
      );
    }
  }, [analyses]);

  const toggleConversation = (id) => {
    setExpandedConversations((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  const analyzeConversation = async () => {
    if (!conversation.trim()) {
      setErrorMessage(
        "Please paste a sales conversation before analyzing."
      );

      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "https://dealradar-ai-backend.onrender.com/analyze-conversation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversation: conversation.trim(),
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "AI quota has been reached. Please try again later or use another Gemini API key."
          );
        }

        if (response.status >= 500) {
          throw new Error(
            "The AI backend encountered an internal error. Please make sure the backend is running and try again."
          );
        }

        throw new Error(
          data?.detail ||
            "The backend could not analyze this conversation."
        );
      }

      if (!data) {
        throw new Error(
          "The backend returned an empty response."
        );
      }

      const newAnalysis = {
        ...data,
        conversation: conversation.trim(),
        id: `${Date.now()}-${Math.random()}`,
        conversationNumber:
          analyses.length + 1,
      };

      setAnalyses((previous) => [
        ...previous,
        newAnalysis,
      ]);

      setConversation("");
      setShowInput(false);
      setErrorMessage("");
    } catch (error) {
      console.error(error);

      if (
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        setErrorMessage(
          "Could not connect to DealRadar AI backend. Make sure FastAPI is running on http://127.0.0.1:8000."
        );
      } else {
        setErrorMessage(
          error.message ||
            "Something went wrong while analyzing the conversation."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setConversation("");
    setShowInput(true);
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const resetAllConversations = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all conversations? This will remove the saved DealRadar history from this browser."
    );

    if (!confirmed) return;

    setAnalyses([]);
    setConversation("");
    setShowInput(true);
    setSearchQuery("");
    setFilterType("all");
    setFilterValue("all");
    setSortOrder("upcoming");
    setErrorMessage("");
    setExpandedConversations({});

    localStorage.removeItem(STORAGE_KEY);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleFilterTypeChange = (event) => {
    setFilterType(event.target.value);
    setFilterValue("all");
  };

  const filteredAndSortedAnalyses = useMemo(() => {
    let results = [...analyses];

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      results = results.filter((item) => {
        const searchableText = [
          item.prospect_name,
          item.company_name,
          item.deal_stage,
          item.intent,
          item.sentiment,
          item.objection,
          item.priority,
          item.next_best_action,
          item.follow_up_date,
          item.conversation,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    if (
      filterType !== "all" &&
      filterValue !== "all"
    ) {
      results = results.filter((item) => {
        if (filterType === "priority") {
          return item.priority === filterValue;
        }

        if (filterType === "intent") {
          return item.intent === filterValue;
        }

        if (filterType === "stage") {
          return item.deal_stage === filterValue;
        }

        if (filterType === "sentiment") {
          return item.sentiment === filterValue;
        }

        return true;
      });
    }

    results.sort((a, b) => {
      if (sortOrder === "newest") {
        return (
          Number(b.id?.split("-")[0] || 0) -
          Number(a.id?.split("-")[0] || 0)
        );
      }

      if (sortOrder === "priority") {
        const priorityRank = {
          High: 1,
          Medium: 2,
          Low: 3,
        };

        return (
          (priorityRank[a.priority] || 4) -
          (priorityRank[b.priority] || 4)
        );
      }

      const dateA = getFollowUpDateValue(
        a.follow_up_date
      );

      const dateB = getFollowUpDateValue(
        b.follow_up_date
      );

      if (sortOrder === "latest") {
        return dateB - dateA;
      }

      return dateA - dateB;
    });

    return results;
  }, [
    analyses,
    filterType,
    filterValue,
    sortOrder,
    searchQuery,
  ]);

  const upcomingFollowUps = useMemo(() => {
    return [...analyses]
      .filter(
        (item) =>
          item.follow_up_required &&
          item.follow_up_date
      )
      .sort(
        (a, b) =>
          getFollowUpDateValue(
            a.follow_up_date
          ) -
          getFollowUpDateValue(
            b.follow_up_date
          )
      );
  }, [analyses]);

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="header">

        <div className="brand-area">

          <div className="logo">
            <span className="logo-icon">
              ✦
            </span>

            DealRadar AI
          </div>

          <p className="tagline">
            AI-powered sales follow-up intelligence
          </p>

        </div>

        <div className="header-actions">

  <div className="status">
    <span className="status-dot"></span>
    AI Ready
  </div>

  {analyses.length > 0 && (
    <>
      <button
        className="top-action-button analyze-top-button"
        onClick={handleAnalyzeAnother}
      >
        ＋ Analyze Another
      </button>

      <button
        className="top-action-button reset-top-button"
        onClick={resetAllConversations}
      >
        ↻ Reset All
      </button>
    </>
  )}

</div>

      </header>


      {/* ================= MAIN ================= */}

      <main className="main">

        {/* ================= HERO ================= */}

        <section className="hero">

          <p className="eyebrow">
            SALES INTELLIGENCE
          </p>

          <h1>
            Never let a promising
            <span> deal go cold.</span>
          </h1>

          <p className="hero-text">
            Analyze sales conversations, identify
            buying intent, understand objections,
            and discover the next best action.
          </p>

        </section>


        {/* ================= ERROR ================= */}

        {errorMessage && (
          <div className="error-banner">

            <div className="error-icon">
              !
            </div>

            <div>
              <strong>
                Analysis issue
              </strong>

              <p>
                {errorMessage}
              </p>
            </div>

            <button
              onClick={() =>
                setErrorMessage("")
              }
              aria-label="Close error"
            >
              ×
            </button>

          </div>
        )}


        {/* ================= INPUT ================= */}

        {showInput && (

          <section className="input-card">

            <div className="card-header">

              <div className="section-title-row">

                <div className="section-icon">
                  ✦
                </div>

                <div>
                  <h2>
                    {analyses.length === 0
                      ? "Analyze Conversation"
                      : "Analyze Another Conversation"}
                  </h2>

                  <p>
                    Paste a call transcript, meeting
                    notes, or email conversation.
                  </p>
                </div>

              </div>

            </div>

            <textarea
              className="conversation-input"
              placeholder="Paste your sales conversation here..."
              value={conversation}
              onChange={(event) =>
                setConversation(
                  event.target.value
                )
              }
              disabled={loading}
            />

            <div className="input-footer">

              <span className="character-hint">
                {conversation.length} characters
              </span>

              <button
                className="analyze-button"
                onClick={analyzeConversation}
                disabled={
                  loading ||
                  !conversation.trim()
                }
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Conversation
                    <span>→</span>
                  </>
                )}
              </button>

            </div>

          </section>

        )}


        {/* ================= ANALYSES ================= */}

        {analyses.length > 0 && (

          <section className="results">

            <div className="results-header">

              <div>

                <p className="eyebrow">
                  AI ANALYSIS
                </p>

                <h2>
                  Sales Intelligence
                </h2>

                <p className="analysis-count">
                  {analyses.length} conversation
                  {analyses.length !== 1
                    ? "s"
                    : ""} analyzed
                </p>

              </div>


              {/* CONTROLS */}

              <div className="controls">

                <div className="search-box">

                  <span>
                    ⌕
                  </span>

                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                  />

                  {searchQuery && (
                    <button
                      className="clear-search"
                      onClick={() =>
                        setSearchQuery("")
                      }
                    >
                      ×
                    </button>
                  )}

                </div>


                <div className="control-group">

                  <span className="control-icon">
                    ◈
                  </span>

                  <select
                    value={filterType}
                    onChange={
                      handleFilterTypeChange
                    }
                  >

                    <option value="all">
                      Filter
                    </option>

                    <option value="priority">
                      Priority
                    </option>

                    <option value="intent">
                      Buying Intent
                    </option>

                    <option value="stage">
                      Deal Stage
                    </option>

                    <option value="sentiment">
                      Sentiment
                    </option>

                  </select>

                </div>


                {filterType !== "all" && (

                  <div className="control-group">

                    <span className="control-icon">
                      ✓
                    </span>

                    <select
                      value={filterValue}
                      onChange={(event) =>
                        setFilterValue(
                          event.target.value
                        )
                      }
                    >

                      <option value="all">
                        All
                      </option>

                      {filterType ===
                        "priority" && (
                        <>
                          <option value="High">
                            High
                          </option>

                          <option value="Medium">
                            Medium
                          </option>

                          <option value="Low">
                            Low
                          </option>
                        </>
                      )}

                      {filterType ===
                        "intent" && (
                        <>
                          <option value="High">
                            High
                          </option>

                          <option value="Medium">
                            Medium
                          </option>

                          <option value="Low">
                            Low
                          </option>
                        </>
                      )}

                      {filterType ===
                        "stage" && (
                        <>
                          <option value="New">
                            New
                          </option>

                          <option value="Qualified">
                            Qualified
                          </option>

                          <option value="Demo">
                            Demo
                          </option>

                          <option value="Evaluation">
                            Evaluation
                          </option>

                          <option value="Negotiation">
                            Negotiation
                          </option>

                          <option value="Closed-Won">
                            Closed-Won
                          </option>

                          <option value="Closed-Lost">
                            Closed-Lost
                          </option>

                          <option value="Unknown">
                            Unknown
                          </option>
                        </>
                      )}

                      {filterType ===
                        "sentiment" && (
                        <>
                          <option value="Positive">
                            Positive
                          </option>

                          <option value="Neutral">
                            Neutral
                          </option>

                          <option value="Negative">
                            Negative
                          </option>

                          <option value="Unknown">
                            Unknown
                          </option>
                        </>
                      )}

                    </select>

                  </div>

                )}


                <div className="control-group">

                  <span className="control-icon">
                    ↕
                  </span>

                  <select
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(
                        event.target.value
                      )
                    }
                  >

                    <option value="upcoming">
                      Follow-up First
                    </option>

                    <option value="priority">
                      Highest Priority
                    </option>

                    <option value="newest">
                      Newest First
                    </option>

                    <option value="latest">
                      Latest Follow-up
                    </option>

                  </select>

                </div>

              </div>

            </div>


            {(searchQuery ||
              filterType !== "all") && (
              <div className="results-summary">

                Showing{" "}
                <strong>
                  {filteredAndSortedAnalyses.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {analyses.length}
                </strong>{" "}
                conversations

              </div>
            )}


            <div className="analysis-list">

              {filteredAndSortedAnalyses.length ===
              0 ? (

                <div className="empty-filter">

                  <div className="empty-icon">
                    ⌕
                  </div>

                  <h3>
                    No conversations found
                  </h3>

                  <p>
                    Try changing your search or
                    filter.
                  </p>

                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                      setFilterValue("all");
                    }}
                  >
                    Clear Search & Filters
                  </button>

                </div>

              ) : (

                filteredAndSortedAnalyses.map(
                  (analysis) => (

                    <article
                      className="analysis-card"
                      key={analysis.id}
                    >

                      {/* CARD TOP */}

                      <div className="analysis-top">

                        <div className="conversation-badge">
                          <span>
                            ◉
                          </span>

                          Conversation #
                          {analysis.conversationNumber}
                        </div>


                        <div className="prospect-heading">

                          <div className="prospect-avatar">
                            {(
                              analysis.prospect_name ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>

                            <span className="detail-label">
                              PROSPECT
                            </span>

                            <h3>
                              {analysis.prospect_name ||
                                "Unknown"}
                            </h3>

                          </div>

                        </div>


                        <div
                          className={`priority priority-${(
                            analysis.priority ||
                            "medium"
                          ).toLowerCase()}`}
                        >

                          <span>
                            ●
                          </span>

                          {analysis.priority ||
                            "Unknown"}{" "}
                          Priority

                        </div>

                      </div>


                      {/* METRICS */}

                      <div className="metrics-grid">

                        <div className="metric-card">

                          <span>
                            🏢 Company
                          </span>

                          <strong>
                            {analysis.company_name ||
                              "Unknown"}
                          </strong>

                        </div>


                        <div className="metric-card">

                          <span>
                            🎯 Deal Stage
                          </span>

                          <strong>
                            {analysis.deal_stage ||
                              "Unknown"}
                          </strong>

                        </div>


                        <div className="metric-card">

                          <span>
                            📈 Buying Intent
                          </span>

                          <strong>
                            {analysis.intent ||
                              "Unknown"}
                          </strong>

                        </div>


                        <div className="metric-card">

                          <span>
                            💬 Sentiment
                          </span>

                          <strong>
                            {analysis.sentiment ||
                              "Unknown"}
                          </strong>

                        </div>


                        <div className="metric-card">

                          <span>
                            ⚠ Objection
                          </span>

                          <strong>
                            {analysis.objection ||
                              "No objection identified"}
                          </strong>

                        </div>


                        <div className="metric-card">

                          <span>
                            📅 Follow-up
                          </span>

                          <strong>
                            {analysis.follow_up_required
                              ? formatDate(
                                  analysis.follow_up_date
                                )
                              : "Not Required"}
                          </strong>

                        </div>

                      </div>


                      {/* NEXT ACTION */}

                      <div className="action-card">

                        <div className="action-icon">
                          🚀
                        </div>

                        <div className="action-content">

                          <span className="detail-label">
                            NEXT BEST ACTION
                          </span>

                          <h3>
                            {analysis.next_best_action ||
                              "No action specified"}
                          </h3>

                        </div>

                      </div>


                      {/* FOLLOW-UP ACTIONS */}

                      {analysis.follow_up_required && (
                        <div className="followup-actions">

                          <div className="followup-status">

                            <span className="calendar-small">
                              📅
                            </span>

                            <div>

                              <strong>
                                Follow-up scheduled
                              </strong>

                              <span>
                                {formatDate(
                                  analysis.follow_up_date
                                )}
                              </span>

                            </div>

                          </div>


                          <button
                            className="calendar-button"
                            onClick={() =>
                              addToCalendar(
                                analysis
                              )
                            }
                            type="button"
                          >

                            <span>
                              📅
                            </span>

                            Add to Calendar

                          </button>

                        </div>
                      )}


                      {/* =========================
                          VIEW ORIGINAL CONVERSATION
                      ========================== */}

                      <div className="conversation-viewer">

                        <button
                          className={`conversation-toggle ${
                            expandedConversations[
                              analysis.id
                            ]
                              ? "conversation-toggle-open"
                              : ""
                          }`}
                          onClick={() =>
                            toggleConversation(
                              analysis.id
                            )
                          }
                          type="button"
                        >

                          <span className="conversation-toggle-left">

                            <span className="conversation-toggle-icon">
                              💬
                            </span>

                            <span className="conversation-toggle-text">

                              <strong>
                                {expandedConversations[
                                  analysis.id
                                ]
                                  ? "Hide Conversation"
                                  : "View Conversation"}
                              </strong>

                              <small>
                                {expandedConversations[
                                  analysis.id
                                ]
                                  ? "Collapse original sales conversation"
                                  : "View the original sales conversation"}
                              </small>

                            </span>

                          </span>

                          <span
                            className={`conversation-chevron ${
                              expandedConversations[
                                analysis.id
                              ]
                                ? "expanded"
                                : ""
                            }`}
                          >
                            ↓
                          </span>

                        </button>


                        {expandedConversations[
                          analysis.id
                        ] && (

                          <div className="conversation-content">

                            <div className="conversation-content-header">

                              <div className="conversation-content-title">

                                <span className="conversation-live-dot"></span>

                                <div>

                                  <span className="detail-label">
                                    ORIGINAL SALES CONVERSATION
                                  </span>

                                  <h4>
                                    Conversation #
                                    {
                                      analysis.conversationNumber
                                    }
                                  </h4>

                                </div>

                              </div>

                              <span className="conversation-character-count">
                                {(
                                  analysis.conversation ||
                                  ""
                                ).length}{" "}
                                characters
                              </span>

                            </div>


                            {analysis.conversation ? (

                              <div className="conversation-text">

                                {analysis.conversation}

                              </div>

                            ) : (

                              <div className="conversation-unavailable">

                                <span>
                                  ⚠
                                </span>

                                <div>
                                  <strong>
                                    Conversation unavailable
                                  </strong>

                                  <p>
                                    Original conversation is
                                    not available for this
                                    older saved analysis.
                                  </p>
                                </div>

                              </div>

                            )}

                          </div>

                        )}

                      </div>

                    </article>

                  )
                )

              )}

            </div>


            {/* ANALYZE ANOTHER */}

            {!showInput && (

              <div className="another-conversation">

                <button
                  className="another-button"
                  onClick={
                    handleAnalyzeAnother
                  }
                >

                  <span className="plus-icon">
                    ＋
                  </span>

                  <span>
                    Analyze Another Conversation
                  </span>

                  <span className="button-arrow">
                    →
                  </span>

                </button>

              </div>

            )}

          </section>

        )}


        {/* ================= UPCOMING ================= */}

        {upcomingFollowUps.length > 0 && (

          <section className="upcoming-section">

            <div className="upcoming-heading">

              <div className="radar-icon">
                ◉
              </div>

              <div>

                <p className="eyebrow">
                  FOLLOW-UP RADAR
                </p>

                <h2>
                  Upcoming Follow-ups
                </h2>

                <p>
                  Your nearest follow-up is shown
                  first.
                </p>

              </div>

            </div>


            <div className="upcoming-list">

              {upcomingFollowUps.map(
                (item, index) => (

                  <div
                    className={`upcoming-card ${
                      index === 0
                        ? "next-followup"
                        : ""
                    }`}
                    key={item.id}
                  >

                    <div className="upcoming-number">

                      {index === 0
                        ? "NEXT"
                        : `#${index + 1}`}

                    </div>


                    <div className="upcoming-date">

                      <span>
                        📅
                      </span>

                      <strong>
                        {formatDate(
                          item.follow_up_date
                        )}
                      </strong>

                    </div>


                    <div className="upcoming-info">

                      <h3>
                        {item.prospect_name ||
                          "Unknown Prospect"}
                      </h3>

                      <p>
                        {item.next_best_action ||
                          "Follow up with prospect"}
                      </p>

                    </div>


                    <div
                      className={`priority priority-${(
                        item.priority ||
                        "medium"
                      ).toLowerCase()}`}
                    >
                      {item.priority ||
                        "Unknown"}
                    </div>


                    <button
                      className="upcoming-calendar"
                      onClick={() =>
                        addToCalendar(item)
                      }
                      title="Add follow-up to Google Calendar"
                      type="button"
                    >
                      📅
                    </button>

                  </div>

                )
              )}

            </div>

          </section>

        )}

      </main>


      {/* ================= FOOTER ================= */}

      <footer>

        <div className="footer-content">

          <div className="footer-brand">

            <div className="footer-logo">
              <span>✦</span>
              DealRadar AI
            </div>

            <p>
              AI-powered sales follow-up
              intelligence
            </p>

          </div>


          <div className="footer-links">

            <a
              href="https://www.linkedin.com/in/pvknvinay0743/"
              target="_blank"
              rel="noreferrer"
            >

              <span className="footer-icon linkedin-icon">
                in
              </span>

              <span>
                LinkedIn
              </span>

            </a>


            <a
              href="https://github.com/pvknvinay0743r"
              target="_blank"
              rel="noreferrer"
            >

              <span className="footer-icon">
                ◈
              </span>

              <span>
                GitHub
              </span>

            </a>


            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=pvknvinay0743@gmail.com"
              target="_blank"
              rel="noreferrer"
            >

              <span className="footer-icon">
                ✉
              </span>

              <span>
                Email
              </span>

            </a>

          </div>


          <div className="footer-divider"></div>


          <p className="footer-copy">

            Built for the Product Space Hackathon

            <span>
              •
            </span>

            DealRadar AI

          </p>

        </div>

      </footer>

    </div>
  );
}

export default App;
