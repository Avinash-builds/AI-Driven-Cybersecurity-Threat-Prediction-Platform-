import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPT = `You are ThreatDoctor, an advanced AI cybersecurity assistant for the ThreatPredict security monitoring platform. You have comprehensive knowledge about:

**Internal Platform Capabilities:**
- Security monitoring and live attack detection
- Website, API, QR code, and static code scanning
- Threat predictions and AI-powered analysis
- Incident management and response
- User role management (admin, analyst, viewer)
- Export functionality for security reports
- Real-time threat feeds and analytics dashboards

**External Cybersecurity Expertise:**
- Common attack vectors (DDoS, SQL Injection, XSS, CSRF, etc.)
- Security best practices and frameworks (OWASP, NIST, etc.)
- Vulnerability assessment and remediation
- Network security and firewall configurations
- Malware analysis and prevention
- Phishing detection and prevention
- Compliance requirements (GDPR, HIPAA, PCI-DSS, etc.)

**Your Communication Style:**
- Be concise but thorough
- Provide actionable recommendations
- Use technical terms appropriately but explain when needed
- Format responses with markdown for readability
- Include severity levels when discussing threats
- Suggest platform features that can help with the user's query

Always prioritize security best practices and help users protect their systems effectively.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ThreatDoctor chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
