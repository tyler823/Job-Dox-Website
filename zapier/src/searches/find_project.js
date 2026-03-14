/**
 * Search: Find Project
 *
 * Looks up a project by status or returns recent projects.
 * Zapier uses this for "Find or Create" workflows.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const perform = async (z, bundle) => {
  const params = { limit: "25" };
  if (bundle.inputData.status) {
    params.status = bundle.inputData.status;
  }

  const response = await z.request({
    url: `${API_BASE}/projects`,
    params,
  });

  const projects = response.data.data || [];

  // If searching by name, filter client-side (Firestore doesn't do full-text)
  if (bundle.inputData.searchName) {
    const needle = bundle.inputData.searchName.toLowerCase();
    return projects.filter(p =>
      (p.name || "").toLowerCase().includes(needle) ||
      (p.clientName || "").toLowerCase().includes(needle)
    );
  }

  return projects;
};

module.exports = {
  key: "find_project",
  noun: "Project",

  display: {
    label: "Find Project",
    description: "Finds a project by name or status.",
    important: true,
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "searchName",
        label: "Search by Name",
        required: false,
        helpText: "Search project name or client name (partial match).",
      },
      {
        key: "status",
        label: "Filter by Status",
        required: false,
        choices: {
          new_lead: "New Lead",
          active: "Active",
          mitigation: "Mitigation",
          reconstruction: "Reconstruction",
          pending_approval: "Pending Approval",
          completed: "Completed",
          closed: "Closed",
          on_hold: "On Hold",
        },
      },
    ],

    sample: {
      id: "proj_abc123",
      name: "Smith Water Damage - 123 Main St",
      type: "Water Damage",
      status: "active",
      clientName: "John Smith",
      clientPhone: "(555) 123-4567",
      clientEmail: "john@example.com",
    },

    outputFields: [
      { key: "id",          label: "Project ID"    },
      { key: "name",        label: "Project Name"  },
      { key: "type",        label: "Project Type"  },
      { key: "status",      label: "Status"        },
      { key: "clientName",  label: "Client Name"   },
      { key: "clientPhone", label: "Client Phone"  },
      { key: "clientEmail", label: "Client Email"  },
    ],
  },
};
