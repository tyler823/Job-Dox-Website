/**
 * Action: Create Project
 *
 * Creates a new project in Job-Dox from Zapier.
 * Use case: Lead form → Zapier → Job-Dox project auto-created.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/projects`,
    method: "POST",
    body: {
      name: bundle.inputData.name,
      type: bundle.inputData.type || "Other",
      status: bundle.inputData.status || "new_lead",
      address: bundle.inputData.address || "",
      clientName: bundle.inputData.clientName || "",
      clientPhone: bundle.inputData.clientPhone || "",
      clientEmail: bundle.inputData.clientEmail || "",
    },
  });
  return response.data.data;
};

module.exports = {
  key: "create_project",
  noun: "Project",

  display: {
    label: "Create Project",
    description: "Creates a new project in Job-Dox (e.g., from a lead form, CRM deal, or inbound call).",
    important: true,
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "name",
        label: "Project Name",
        required: true,
        helpText: 'e.g., "Smith Water Damage - 123 Main St"',
      },
      {
        key: "type",
        label: "Project Type",
        required: false,
        choices: [
          "Water Damage", "Fire & Smoke", "Mold Remediation",
          "Storm Damage", "Reconstruction", "Contents",
          "HVAC", "Plumbing", "Electrical", "Demo", "Other",
        ],
        default: "Water Damage",
      },
      {
        key: "status",
        label: "Initial Status",
        required: false,
        choices: {
          new_lead: "New Lead",
          active: "Active",
          mitigation: "Mitigation",
          reconstruction: "Reconstruction",
        },
        default: "new_lead",
      },
      { key: "clientName",  label: "Client Name",  required: false },
      { key: "clientPhone", label: "Client Phone", required: false },
      { key: "clientEmail", label: "Client Email", required: false },
      { key: "address",     label: "Address",      required: false },
    ],

    sample: {
      id: "proj_new123",
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
