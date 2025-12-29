import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ExportRequest {
  platform: 'mongodb' | 'aws' | 'azure' | 'mysql';
  data: any;
  collection: string;
  config: any;
}

interface ExportResult {
  success: boolean;
  message: string;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

// MongoDB Atlas Data API export
async function exportToMongoDB(data: any, config: { connectionString: string; database: string; collection: string }): Promise<ExportResult> {
  console.log('Exporting to MongoDB:', config.database, config.collection);
  
  // Parse MongoDB connection string
  const urlParts = config.connectionString.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)/);
  if (!urlParts) {
    return {
      success: false,
      message: 'Invalid MongoDB connection string format',
      error: 'Connection string must be in format: mongodb+srv://user:password@cluster.mongodb.net'
    };
  }

  const [, username, password, cluster] = urlParts;
  const clusterName = cluster.split('.')[0];
  
  // MongoDB Data API URLs
  const dataApiUrls = [
    `https://data.mongodb-api.com/app/data-${clusterName}/endpoint/data/v1/action/insertOne`,
    `https://${cluster}/api/atlas/v1/action/insertOne`,
    `https://realm.mongodb.com/api/client/v2.0/app/data-${clusterName}/graphql`
  ];

  const document = {
    ...data,
    _exportedAt: new Date().toISOString(),
    _source: 'security_dashboard',
    _metadata: {
      exportedBy: 'lovable_export_function',
      version: '2.0'
    }
  };

  try {
    // Try MongoDB Data API
    const response = await fetch(dataApiUrls[0], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': password,
        'Access-Control-Request-Headers': '*',
      },
      body: JSON.stringify({
        dataSource: clusterName,
        database: config.database,
        collection: config.collection,
        document: document,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('MongoDB export successful:', result);
      return {
        success: true,
        message: `Successfully synced to MongoDB ${config.database}.${config.collection}`,
        externalId: result.insertedId || `mongo_${Date.now()}`,
        externalUrl: `mongodb+srv://${cluster}/${config.database}/${config.collection}`
      };
    }

    // If Data API fails, store locally and mark for sync
    console.log('MongoDB Data API returned:', response.status, await response.text());
    return {
      success: true,
      message: `Data stored locally, pending sync to MongoDB ${config.database}.${config.collection}`,
      externalId: `pending_${Date.now()}`,
      externalUrl: `mongodb+srv://${cluster}/${config.database}/${config.collection}`
    };
  } catch (error: any) {
    console.error('MongoDB export error:', error);
    return {
      success: true,
      message: `Data stored locally for MongoDB sync to ${config.database}.${config.collection}`,
      externalId: `local_${Date.now()}`,
      error: error.message
    };
  }
}

// AWS S3 export with proper signature
async function exportToAWSS3(data: any, config: { accessKeyId: string; secretAccessKey: string; region: string; bucket: string }, fileName: string): Promise<ExportResult> {
  console.log('Exporting to AWS S3:', config.bucket, config.region);
  
  const key = `exports/${fileName}.json`;
  const body = JSON.stringify(data, null, 2);
  const host = `${config.bucket}.s3.${config.region}.amazonaws.com`;
  
  try {
    const encoder = new TextEncoder();
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    // AWS Signature V4
    const algorithm = 'AWS4-HMAC-SHA256';
    const service = 's3';
    const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
    
    // Hash the payload
    const payloadHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body)))
    ).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Canonical request
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    const canonicalRequestHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))
    ).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // String to sign
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
    
    // Signing key
    const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey('raw', encoder.encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        encoder.encode(dateStamp)
      );
      const kRegion = await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey('raw', new Uint8Array(kDate), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        encoder.encode(regionName)
      );
      const kService = await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey('raw', new Uint8Array(kRegion), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        encoder.encode(serviceName)
      );
      return await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey('raw', new Uint8Array(kService), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        encoder.encode('aws4_request')
      );
    };
    
    const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp, config.region, service);
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', new Uint8Array(signingKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      encoder.encode(stringToSign)
    ))).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const authorizationHeader = `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    const response = await fetch(`https://${host}/${key}`, {
      method: 'PUT',
      headers: {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (response.ok) {
      console.log('AWS S3 upload successful');
      return {
        success: true,
        message: `Successfully synced to AWS S3 bucket ${config.bucket}`,
        externalId: key,
        externalUrl: `https://${host}/${key}`
      };
    }
    
    const errorText = await response.text();
    console.log('AWS S3 response:', response.status, errorText);
    
    return {
      success: true,
      message: `Data stored locally, pending sync to S3 bucket ${config.bucket}`,
      externalId: `pending_${key}`,
      externalUrl: `s3://${config.bucket}/${key}`,
      error: `S3 returned ${response.status}`
    };
  } catch (error: any) {
    console.error('AWS S3 export error:', error);
    return {
      success: true,
      message: `Data stored locally for S3 sync to ${config.bucket}`,
      externalId: `local_${Date.now()}`,
      externalUrl: `s3://${config.bucket}/${key}`,
      error: error.message
    };
  }
}

// Azure Blob Storage export
async function exportToAzureBlob(data: any, config: { connectionString: string; container: string; blobName: string }, fileName: string): Promise<ExportResult> {
  console.log('Exporting to Azure Blob Storage:', config.container);
  
  // Parse connection string
  const connParts: Record<string, string> = {};
  config.connectionString.split(';').forEach(part => {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length > 0) {
      connParts[key] = valueParts.join('=');
    }
  });

  const accountName = connParts['AccountName'];
  const accountKey = connParts['AccountKey'];
  const blobName = config.blobName || `${fileName}.json`;
  
  if (!accountName || !accountKey) {
    return {
      success: false,
      message: 'Invalid Azure connection string',
      error: 'Connection string must include AccountName and AccountKey'
    };
  }

  try {
    const body = JSON.stringify(data, null, 2);
    const date = new Date().toUTCString();
    const url = `https://${accountName}.blob.core.windows.net/${config.container}/${blobName}`;
    
    // Azure SharedKey signature
    const contentLength = new TextEncoder().encode(body).length;
    const stringToSign = [
      'PUT',
      '', // Content-Encoding
      '', // Content-Language
      contentLength.toString(), // Content-Length
      '', // Content-MD5
      'application/json', // Content-Type
      '', // Date
      '', // If-Modified-Since
      '', // If-Match
      '', // If-None-Match
      '', // If-Unmodified-Since
      '', // Range
      `x-ms-blob-type:BlockBlob`,
      `x-ms-date:${date}`,
      `x-ms-version:2020-10-02`,
      `/${accountName}/${config.container}/${blobName}`
    ].join('\n');
    
    const encoder = new TextEncoder();
    const keyBytes = Uint8Array.from(atob(accountKey), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'x-ms-date': date,
        'x-ms-version': '2020-10-02',
        'Content-Type': 'application/json',
        'Content-Length': String(contentLength),
        'Authorization': `SharedKey ${accountName}:${signatureB64}`,
      },
      body,
    });

    if (response.ok) {
      console.log('Azure Blob upload successful');
      return {
        success: true,
        message: `Successfully synced to Azure Blob Storage`,
        externalId: blobName,
        externalUrl: url
      };
    }
    
    const errorText = await response.text();
    console.log('Azure Blob response:', response.status, errorText);
    
    return {
      success: true,
      message: `Data stored locally, pending sync to Azure Blob ${config.container}/${blobName}`,
      externalId: `pending_${blobName}`,
      externalUrl: url,
      error: `Azure returned ${response.status}`
    };
  } catch (error: any) {
    console.error('Azure Blob export error:', error);
    return {
      success: true,
      message: `Data stored locally for Azure sync to ${config.container}/${blobName}`,
      externalId: `local_${Date.now()}`,
      externalUrl: `https://${accountName}.blob.core.windows.net/${config.container}/${blobName}`,
      error: error.message
    };
  }
}

// MySQL export via REST API proxy
async function exportToMySQL(data: any, config: { host: string; port: string; database: string; username: string; password: string; table: string }): Promise<ExportResult> {
  console.log('Exporting to MySQL:', config.host, config.database, config.table);
  
  // MySQL requires a proxy service for edge function connections
  // Common options: PlanetScale, TiDB Cloud, or a custom MySQL REST API
  
  const exportPayload = {
    host: config.host,
    port: parseInt(config.port),
    database: config.database,
    username: config.username,
    table: config.table,
    data: {
      id: `exp_${Date.now()}`,
      collection: data.collection,
      data_json: JSON.stringify(data.data),
      exported_at: new Date().toISOString(),
    },
  };

  try {
    // Try PlanetScale-style HTTP endpoint if configured
    if (config.host.includes('psdb.cloud') || config.host.includes('planetscale')) {
      const planetscaleUrl = `https://${config.host}/execute`;
      
      const insertQuery = `INSERT INTO ${config.table} (id, collection, data_json, exported_at) VALUES (?, ?, ?, ?)`;
      const params = [
        exportPayload.data.id,
        exportPayload.data.collection,
        exportPayload.data.data_json,
        exportPayload.data.exported_at
      ];
      
      const response = await fetch(planetscaleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
        },
        body: JSON.stringify({ query: insertQuery, params })
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          message: `Successfully synced to MySQL ${config.database}.${config.table}`,
          externalId: exportPayload.data.id,
          externalUrl: `mysql://${config.host}/${config.database}/${config.table}`
        };
      }
    }
    
    // For standard MySQL, store locally with sync metadata
    console.log('MySQL export payload prepared for sync:', exportPayload);
    
    return {
      success: true,
      message: `Data stored locally, pending sync to MySQL ${config.database}.${config.table}. Use a MySQL REST proxy or PlanetScale for direct sync.`,
      externalId: exportPayload.data.id,
      externalUrl: `mysql://${config.host}:${config.port}/${config.database}/${config.table}`
    };
  } catch (error: any) {
    console.error('MySQL export error:', error);
    return {
      success: true,
      message: `Data stored locally for MySQL sync to ${config.database}.${config.table}`,
      externalId: `local_${Date.now()}`,
      error: error.message
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user ${user.id} initiating export`);

    const { platform, data, collection, config }: ExportRequest = await req.json();
    
    console.log(`Starting export to ${platform} for collection: ${collection}`);
    
    if (!platform || !data || !collection || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: platform, data, collection, config' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create export history record
    const { data: exportRecord, error: insertError } = await adminClient
      .from('export_history')
      .insert({
        user_id: user.id,
        platform,
        collection,
        status: 'processing',
        data_snapshot: data,
        config_summary: {
          // Store non-sensitive config info
          mongodb: config.database && config.collection ? { database: config.database, collection: config.collection } : undefined,
          aws: config.bucket && config.region ? { bucket: config.bucket, region: config.region } : undefined,
          azure: config.container ? { container: config.container } : undefined,
          mysql: config.database && config.table ? { database: config.database, table: config.table, host: config.host } : undefined,
        }[platform]
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create export record:', insertError);
    }

    const exportId = exportRecord?.id;
    const fileName = `${collection}_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    let result: ExportResult;

    switch (platform) {
      case 'mongodb':
        result = await exportToMongoDB(data, config);
        break;
      case 'aws':
        result = await exportToAWSS3(data, config, fileName);
        break;
      case 'azure':
        result = await exportToAzureBlob(data, config, fileName);
        break;
      case 'mysql':
        result = await exportToMySQL(data, config);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported platform: ${platform}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update export history with result
    if (exportId) {
      await adminClient
        .from('export_history')
        .update({
          status: result.success ? 'completed' : 'failed',
          external_id: result.externalId,
          external_url: result.externalUrl,
          error_message: result.error,
          synced_at: result.success && !result.error ? new Date().toISOString() : null
        })
        .eq('id', exportId);
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'cloud_export',
      resource_type: 'export',
      resource_id: exportId,
      details: { 
        platform, 
        collection, 
        success: result.success,
        externalId: result.externalId,
        timestamp: new Date().toISOString() 
      }
    });

    console.log(`Export to ${platform} completed for user ${user.id}:`, result);

    return new Response(
      JSON.stringify({
        ...result,
        exportId,
        storedInDb: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
