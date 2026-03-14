/**
 * auth.js — Zapier authentication configuration
 *
 * Uses API Key auth. The user pastes their Job-Dox API key
 * (jdx_live_...) from Settings → API Keys in Job-Dox.
 *
 * Zapier sends it as "Authorization: Bearer <key>" on every request.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

// Test the API key by hitting GET /company
const test = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/company`,
    method: "GET",
  });
  if (response.status === 401) {
    throw new z.errors.Error("Invalid API key. Go to Job-Dox → Settings → API Keys to generate one.");
  }
  return response.data;
};

module.exports = {
  type: "custom",
  test,
  fields: [
    {
      computed: false,
      key: "apiKey",
      required: true,
      label: "API Key",
      type: "string",
      helpText:
        "Your Job-Dox API key. Go to **Settings → API Keys** in your Job-Dox portal to generate one. It starts with `jdx_live_`.",
    },
  ],
  connectionLabel: (z, bundle) => {
    return `Job-Dox (${bundle.inputData.apiKeyName || "Connected"})`;
  },
  customConfig: {
    // Inject the API key as a Bearer token on every request
  },
};
