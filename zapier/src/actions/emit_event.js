/**
 * Action: Emit Event
 *
 * Pushes a custom event into the Job-Dox event bus.
 * This can trigger automations inside Job-Dox (send SMS, create task, etc.).
 * Use case: External form → Zapier → emit event → Job-Dox automation fires.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/events`,
    method: "POST",
    body: {
      type: bundle.inputData.eventType,
      projectId: bundle.inputData.projectId || null,
      payload: bundle.inputData.payload ? JSON.parse(bundle.inputData.payload) : {},
    },
  });
  return response.data.data;
};

module.exports = {
  key: "emit_event",
  noun: "Event",

  display: {
    label: "Emit Event",
    description: "Fires a custom event into Job-Dox, which can trigger automations (SMS, email, tasks, etc.).",
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "eventType",
        label: "Event Type",
        required: true,
        helpText: 'The event type string, e.g., "project.created" or a custom type like "lead.qualified".',
      },
      {
        key: "projectId",
        label: "Project ID",
        required: false,
        helpText: "Optional — link this event to a specific project.",
      },
      {
        key: "payload",
        label: "Event Data (JSON)",
        required: false,
        helpText: 'Optional JSON payload, e.g., {"source": "google_ads", "campaign": "spring_2026"}',
      },
    ],

    sample: {
      id: "evt_custom_001",
      type: "lead.qualified",
      source: "api",
      projectId: null,
      payload: { source: "google_ads" },
      createdAt: "2026-03-14T12:00:00.000Z",
    },

    outputFields: [
      { key: "id",        label: "Event ID"   },
      { key: "type",      label: "Event Type" },
      { key: "source",    label: "Source"      },
      { key: "projectId", label: "Project ID" },
      { key: "createdAt", label: "Created At" },
    ],
  },
};
