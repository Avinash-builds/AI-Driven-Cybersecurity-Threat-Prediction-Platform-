import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// SECURITY: URL validation to prevent SSRF attacks
function validateUrl(urlString: string): { valid: boolean; error?: string; url?: URL } {
  let url: URL;
  
  try {
    url = new URL(urlString);
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP/HTTPS protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost and loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return { valid: false, error: 'Localhost access is not allowed' };
  }

  // Block private IPv4 ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Regex);
  if (ipv4Match) {
    const [_, a, b, c, d] = ipv4Match.map(Number);
    if (
      (a === 10) || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) || // 169.254.0.0/16 (link-local, cloud metadata)
      (a === 127) || // 127.0.0.0/8
      (a === 0) // 0.0.0.0/8
    ) {
      return { valid: false, error: 'Private IP ranges are not allowed' };
    }
  }

  // Block cloud metadata endpoints
  const blockedDomains = [
    'metadata.google.internal',
    'metadata',
    'instance-data',
    '169.254.169.254',
    'metadata.azure.com'
  ];
  if (blockedDomains.some(d => hostname.includes(d))) {
    return { valid: false, error: 'Cloud metadata endpoints are not allowed' };
  }

  return { valid: true, url };
}

function generateFallbackAnalysis(url: string, isHttps: boolean, headers: Record<string, string>, responseTime: number): any {
  const hasSecurityHeaders = {
    'X-Frame-Options': !!headers['x-frame-options'],
    'X-Content-Type-Options': !!headers['x-content-type-options'],
    'Strict-Transport-Security': !!headers['strict-transport-security'],
    'Content-Security-Policy': !!headers['content-security-policy'],
    'X-XSS-Protection': !!headers['x-xss-protection'],
    'Referrer-Policy': !!headers['referrer-policy'],
    'Permissions-Policy': !!headers['permissions-policy'],
  };

  const missingHeaders = Object.entries(hasSecurityHeaders).filter(([_, present]) => !present);
  const headerScore = Object.values(hasSecurityHeaders).filter(Boolean).length;
  
  let riskScore = 25; // Base score
  if (!isHttps) riskScore += 30;
  riskScore += (7 - headerScore) * 5; // Add points for missing headers
  riskScore = Math.min(100, riskScore);

  const vulnerabilities = [];
  
  if (!isHttps) {
    vulnerabilities.push({
      name: 'Insecure HTTP Connection',
      severity: 'critical',
      description: 'Website is not using HTTPS, data is transmitted in plain text',
      recommendation: 'Implement TLS/SSL certificate and enforce HTTPS',
      cve_id: null
    });
  }

  if (!headers['strict-transport-security']) {
    vulnerabilities.push({
      name: 'Missing HSTS Header',
      severity: 'high',
      description: 'HTTP Strict Transport Security header is not configured',
      recommendation: 'Add Strict-Transport-Security header with max-age of at least 31536000',
      cve_id: null
    });
  }

  if (!headers['content-security-policy']) {
    vulnerabilities.push({
      name: 'Missing Content Security Policy',
      severity: 'medium',
      description: 'No Content-Security-Policy header to prevent XSS attacks',
      recommendation: 'Implement a strict Content-Security-Policy header',
      cve_id: null
    });
  }

  if (!headers['x-frame-options']) {
    vulnerabilities.push({
      name: 'Clickjacking Vulnerability',
      severity: 'medium',
      description: 'Missing X-Frame-Options header allows clickjacking attacks',
      recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN header',
      cve_id: null
    });
  }

  if (!headers['x-content-type-options']) {
    vulnerabilities.push({
      name: 'MIME Type Sniffing',
      severity: 'low',
      description: 'Browser may interpret files as different MIME types',
      recommendation: 'Add X-Content-Type-Options: nosniff header',
      cve_id: null
    });
  }

  return {
    risk_score: riskScore,
    total_vulnerabilities: vulnerabilities.length,
    owasp_compliance: {
      "A01:2021-Broken Access Control": "WARN",
      "A02:2021-Cryptographic Failures": isHttps ? "PASS" : "FAIL",
      "A03:2021-Injection": "WARN",
      "A04:2021-Insecure Design": "WARN",
      "A05:2021-Security Misconfiguration": headerScore >= 5 ? "PASS" : headerScore >= 3 ? "WARN" : "FAIL",
      "A06:2021-Vulnerable Components": "WARN",
      "A07:2021-Auth Failures": "WARN",
      "A08:2021-Software Integrity": headers['content-security-policy'] ? "PASS" : "WARN",
      "A09:2021-Logging Failures": "WARN",
      "A10:2021-SSRF": "PASS"
    },
    vulnerabilities,
    security_headers: hasSecurityHeaders,
    ssl_info: {
      grade: isHttps ? (headers['strict-transport-security'] ? "A" : "B") : "F",
      protocol: isHttps ? "TLS 1.2/1.3" : "None",
      issuer: isHttps ? "Unknown CA" : "N/A",
      expires: isHttps ? "Unknown" : "N/A"
    },
    response_time_ms: responseTime
  };
}

async function analyzeWithGemini(url: string, scanData: any): Promise<any> {
  if (!GEMINI_API_KEY) {
    console.log('No Gemini API key, using fallback analysis');
    return null;
  }

  const prompt = `You are a cybersecurity expert. Analyze this website scan data and provide a security assessment.

URL: ${url}
Scan Data: ${JSON.stringify(scanData)}

Provide a JSON response with this exact structure (no markdown, just JSON):
{
  "risk_score": <number 0-100>,
  "total_vulnerabilities": <number>,
  "owasp_compliance": {
    "A01:2021-Broken Access Control": "PASS" | "FAIL" | "WARN",
    "A02:2021-Cryptographic Failures": "PASS" | "FAIL" | "WARN",
    "A03:2021-Injection": "PASS" | "FAIL" | "WARN",
    "A04:2021-Insecure Design": "PASS" | "FAIL" | "WARN",
    "A05:2021-Security Misconfiguration": "PASS" | "FAIL" | "WARN",
    "A06:2021-Vulnerable Components": "PASS" | "FAIL" | "WARN",
    "A07:2021-Auth Failures": "PASS" | "FAIL" | "WARN",
    "A08:2021-Software Integrity": "PASS" | "FAIL" | "WARN",
    "A09:2021-Logging Failures": "PASS" | "FAIL" | "WARN",
    "A10:2021-SSRF": "PASS" | "FAIL" | "WARN"
  },
  "vulnerabilities": [
    {
      "name": "string",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "string",
      "recommendation": "string",
      "cve_id": "string or null"
    }
  ],
  "security_headers": {
    "X-Frame-Options": true | false,
    "X-Content-Type-Options": true | false,
    "Strict-Transport-Security": true | false,
    "Content-Security-Policy": true | false,
    "X-XSS-Protection": true | false,
    "Referrer-Policy": true | false
  },
  "ssl_info": {
    "grade": "A+" | "A" | "B" | "C" | "D" | "F",
    "protocol": "string",
    "issuer": "string",
    "expires": "string"
  }
}

Only respond with valid JSON, no other text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('No text in Gemini response');
      return null;
    }
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON
      const rawMatch = text.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }
    
    const parsed = JSON.parse(jsonStr);
    console.log('Gemini analysis successful');
    return parsed;
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user ${user.id} initiating website scan`);

    const { url: urlString } = await req.json();
    
    if (!urlString) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate URL to prevent SSRF
    const validation = validateUrl(urlString);
    if (!validation.valid) {
      console.warn(`URL validation failed for ${urlString}: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = validation.url!.href;
    console.log(`Starting website scan for: ${url}`);

    // Use service role for database operations
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: monitoringStatus } = await supabase
      .from('monitoring_status')
      .select('status')
      .single();

    if (monitoringStatus?.status === 'paused') {
      return new Response(
        JSON.stringify({ error: 'Monitoring is paused. Resume to perform scans.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if domain is blocked
    const domain = validation.url!.hostname;
    const { data: blockedEntity } = await supabase
      .from('blocked_entities')
      .select('*')
      .eq('type', 'domain')
      .eq('value', domain)
      .maybeSingle();

    if (blockedEntity) {
      return new Response(
        JSON.stringify({ error: 'This domain is blocked', blocked: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic website analysis
    const startTime = Date.now();
    
    let headers: Record<string, string> = {};
    const isHttps = url.startsWith('https');
    
    try {
      const fetchResponse = await fetch(url, { 
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      fetchResponse.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    } catch (e) {
      console.log('Could not fetch URL directly:', e);
    }

    const responseTime = Date.now() - startTime;

    const scanData = {
      url,
      isHttps,
      headers,
      responseTime,
      timestamp: new Date().toISOString()
    };

    // Use Gemini for comprehensive analysis, with fallback
    let analysisResult = await analyzeWithGemini(url, scanData);
    
    if (!analysisResult) {
      console.log('Using fallback analysis');
      analysisResult = generateFallbackAnalysis(url, isHttps, headers, responseTime);
    }

    // Add scan duration
    analysisResult.scan_duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

    // Store scan result with user ID
    const { error: insertError } = await supabase.from('scan_results').insert({
      scan_type: 'website',
      target: url,
      status: 'completed',
      result: analysisResult,
      threats_found: analysisResult.total_vulnerabilities || 0,
      severity: analysisResult.risk_score > 70 ? 'critical' : analysisResult.risk_score > 50 ? 'high' : 'medium',
      completed_at: new Date().toISOString(),
      created_by: user.id
    });

    if (insertError) {
      console.error('Failed to store scan result:', insertError);
    }

    // If threats found, create threat record
    if (analysisResult.total_vulnerabilities > 0) {
      await supabase.from('threats').insert({
        source_type: 'website',
        domain: domain,
        severity: analysisResult.risk_score > 70 ? 'critical' : analysisResult.risk_score > 50 ? 'high' : 'medium',
        attack_type: 'Website Vulnerability',
        confidence: 0.85,
        raw_data: analysisResult
      });
    }

    // Audit log the scan
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'website_scan',
      resource_type: 'scan',
      details: { url, threats_found: analysisResult.total_vulnerabilities || 0 }
    });

    console.log(`Website scan completed for user ${user.id}: ${url}`);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Scan error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
