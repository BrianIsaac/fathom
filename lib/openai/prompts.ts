export const DD_SYNTHESIS_PROMPT = `Given the following extracted data from multiple sources about {company_name}, produce a structured risk assessment.

Data sources:
{source_results_json}

Produce a JSON response with this exact structure:
{
  "risk_score": <1-10 integer>,
  "risk_level": "<LOW|LOW-MEDIUM|MEDIUM|MEDIUM-HIGH|HIGH>",
  "summary": "<2-3 sentence executive summary>",
  "red_flags": [{"severity": "<low|medium|high>", "source": "<source_id>", "detail": "<description>"}],
  "key_facts": ["<fact 1>", "<fact 2>"],
  "data_completeness": "<X/Y sources returned data>",
  "citations": [{"fact": "<specific claim>", "source": "<source name>"}]
}

Rules:
- Only cite facts present in the source data. Never fabricate.
- Flag data gaps as a risk factor.
- If a source returned an error, note it in data_completeness.
- Be conservative with risk scoring.`;

export const EARNINGS_SYNTHESIS_PROMPT = `Given earnings data from multiple sources for {ticker}, produce a structured summary.

Data:
{source_results_json}

Produce JSON:
{
  "ticker": str,
  "company_name": str,
  "report_date": str,
  "fiscal_quarter": str,
  "financials": {
    "eps_actual": float or null,
    "eps_consensus": float or null,
    "eps_surprise": str,
    "revenue_actual": str or null,
    "revenue_consensus": str or null,
    "revenue_surprise": str,
    "guidance": str or null
  },
  "analyst_tone": str,
  "source_urls": [str]
}

Cross-reference figures. Prefer company IR > Yahoo Finance > Seeking Alpha.`;

export const REGULATORY_SYNTHESIS_PROMPT = `Given publications from financial regulators, produce a relevance-scored brief for a firm with these business domains: {business_domains}.

Publications:
{publications_json}

Produce JSON:
{
  "publications": [{
    "title": str, "regulator": str, "jurisdiction": str, "date": str,
    "document_type": str, "url": str, "relevance_score": <1-10>,
    "affected_domains": [str], "comment_deadline": str or null,
    "summary": str
  }],
  "synthesis": {
    "urgent_actions": [str],
    "monitoring_items": [str],
    "informational": [str]
  }
}

Score relevance 1-10 based on direct impact on stated business domains.
Urgent = score >= 8 or deadline within 60 days.`;
