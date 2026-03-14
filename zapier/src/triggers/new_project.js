/**
 * Trigger: New Project Created
 *
 * Fires when a new project is created in Job-Dox.
 * Uses REST Hook (webhook) for instant triggers, with polling fallback.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

// Polling fallback — Zapier calls this every few minutes
const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/projects`,
    params: { limit: "25" },
  });
  return response.data.data || [];
};

// Subscribe — register a webhook for project.created
const performSubscribe = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/webhooks`,
    method: "POST",
    body: {
      url: bundle.targetUrl,
      events: ["project.created"],
      name: `Zapier - New Project (${bundle.meta.zap.id || "unknown"})`,
    },
  });
  return response.data.data;
};

// Unsubscribe — remove the webhook
const performUnsubscribe = async (z, bundle) => {
  await z.request({
    url: `${API_BASE}/webhooks/${bundle.subscribeData.id}`,
    method: "DELETE",
  });
  return {};
};

// Parse incoming webhook payload
const parsePayload = (z, bundle) => {
  return [bundle.cleanedRequest.data || bundle.cleanedRequest];
};

module.exports = {
  key: "new_project",
  noun: "Project",

  display: {
    label: "New Project",
    description: "Triggers when a new project is created in Job-Dox.",
    important: true,
  },

  operation: {
    type: "hook",
    performSubscribe,
    performUnsubscribe,
    perform: parsePayload,
    performList: perform,

    sample: {
      id: "abc123",
      name: "Smith Water Damage - 123 Main St",
      type: "Water Damage",
      status: "new_lead",
      clientName: "John Smith",
      clientPhone: "(555) 123-4567",
      clientEmail: "john@example.com",
      address: "123 Main St, Springfield, IL",
      createdAt: "2026-03-14T12:00:00.000Z",
    },

    outputFields: [
      { key: "id",          label: "Project ID"    },
      { key: "name",        label: "Project Name"  },
      { key: "type",        label: "Project Type"  },
      { key: "status",      label: "Status"        },
      { key: "clientName",  label: "Client Name"   },
      { key: "clientPhone", label: "Client Phone"  },
      { key: "clientEmail", label: "Client Email"  },
      { key: "address",     label: "Address"       },
      { key: "createdAt",   label: "Created At"    },
    ],
  },
};
