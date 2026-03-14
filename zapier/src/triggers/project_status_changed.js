/**
 * Trigger: Project Status Changed
 *
 * Fires when a project's status changes (e.g., new_lead → active → completed).
 * Great for CRM sync — push status updates to HubSpot, Salesforce, etc.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/events`,
    params: { type: "project.status_changed", limit: "25" },
  });
  return (response.data.data || []).map(event => ({
    id: event.id,
    projectId: event.projectId,
    oldStatus: event.payload?.oldStatus || "",
    newStatus: event.payload?.newStatus || "",
    timestamp: event.createdAt,
  }));
};

const performSubscribe = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/webhooks`,
    method: "POST",
    body: {
      url: bundle.targetUrl,
      events: ["project.status_changed"],
      name: `Zapier - Status Changed (${bundle.meta.zap.id || "unknown"})`,
    },
  });
  return response.data.data;
};

const performUnsubscribe = async (z, bundle) => {
  await z.request({
    url: `${API_BASE}/webhooks/${bundle.subscribeData.id}`,
    method: "DELETE",
  });
  return {};
};

const parsePayload = (z, bundle) => {
  const data = bundle.cleanedRequest.data || bundle.cleanedRequest;
  return [{
    id: data.id || bundle.cleanedRequest.id,
    projectId: data.projectId,
    oldStatus: data.payload?.oldStatus || data.oldStatus || "",
    newStatus: data.payload?.newStatus || data.newStatus || "",
    timestamp: data.createdAt || bundle.cleanedRequest.timestamp,
  }];
};

module.exports = {
  key: "project_status_changed",
  noun: "Project Status",

  display: {
    label: "Project Status Changed",
    description: "Triggers when a project's status changes (e.g., new lead → active → completed).",
    important: true,
  },

  operation: {
    type: "hook",
    performSubscribe,
    performUnsubscribe,
    perform: parsePayload,
    performList: perform,

    sample: {
      id: "evt_123",
      projectId: "proj_abc",
      oldStatus: "new_lead",
      newStatus: "active",
      timestamp: "2026-03-14T12:00:00.000Z",
    },

    outputFields: [
      { key: "id",        label: "Event ID"    },
      { key: "projectId", label: "Project ID"  },
      { key: "oldStatus", label: "Old Status"  },
      { key: "newStatus", label: "New Status"  },
      { key: "timestamp", label: "Changed At"  },
    ],
  },
};
