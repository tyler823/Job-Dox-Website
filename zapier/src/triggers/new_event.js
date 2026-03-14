/**
 * Trigger: New Event (Catch-All)
 *
 * Fires on any event type. Users pick which event type to watch.
 * Useful for advanced automations — task completed, estimate accepted, etc.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const EVENT_CHOICES = [
  "project.created",
  "project.status_changed",
  "project.assigned",
  "note.added",
  "drydox.reading_logged",
  "drydox.dry_standard",
  "estimate.created",
  "estimate.accepted",
  "shift.clocked_in",
  "shift.clocked_out",
  "task.completed",
  "document.uploaded",
  "review.requested",
  "review.received",
];

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/events`,
    params: {
      type: bundle.inputData.eventType,
      limit: "25",
    },
  });
  return response.data.data || [];
};

const performSubscribe = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/webhooks`,
    method: "POST",
    body: {
      url: bundle.targetUrl,
      events: [bundle.inputData.eventType],
      name: `Zapier - ${bundle.inputData.eventType} (${bundle.meta.zap.id || "unknown"})`,
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
  return [bundle.cleanedRequest.data || bundle.cleanedRequest];
};

module.exports = {
  key: "new_event",
  noun: "Event",

  display: {
    label: "New Event (Any Type)",
    description: "Triggers on a specific Job-Dox event type — task completed, estimate accepted, note added, etc.",
  },

  operation: {
    type: "hook",
    performSubscribe,
    performUnsubscribe,
    perform: parsePayload,
    performList: perform,

    inputFields: [
      {
        key: "eventType",
        label: "Event Type",
        required: true,
        choices: EVENT_CHOICES.reduce((acc, e) => {
          acc[e] = e.replace(/\./g, " → ").replace(/\b\w/g, c => c.toUpperCase());
          return acc;
        }, {}),
        helpText: "Choose which event type to watch.",
      },
    ],

    sample: {
      id: "evt_456",
      type: "task.completed",
      source: "portal",
      projectId: "proj_abc",
      payload: { taskTitle: "Install dehumidifiers" },
      createdAt: "2026-03-14T14:30:00.000Z",
    },

    outputFields: [
      { key: "id",        label: "Event ID"    },
      { key: "type",      label: "Event Type"  },
      { key: "source",    label: "Source"       },
      { key: "projectId", label: "Project ID"  },
      { key: "payload",   label: "Event Data"  },
      { key: "createdAt", label: "Created At"  },
    ],
  },
};
