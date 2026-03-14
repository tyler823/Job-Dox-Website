/**
 * Action: Update Project
 *
 * Updates an existing project in Job-Dox.
 * Use case: CRM deal stage changes → update project status in Job-Dox.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const perform = async (z, bundle) => {
  const updates = {};
  if (bundle.inputData.name)        updates.name = bundle.inputData.name;
  if (bundle.inputData.type)        updates.type = bundle.inputData.type;
  if (bundle.inputData.status)      updates.status = bundle.inputData.status;
  if (bundle.inputData.address)     updates.address = bundle.inputData.address;
  if (bundle.inputData.clientName)  updates.clientName = bundle.inputData.clientName;
  if (bundle.inputData.clientPhone) updates.clientPhone = bundle.inputData.clientPhone;
  if (bundle.inputData.clientEmail) updates.clientEmail = bundle.inputData.clientEmail;

  const response = await z.request({
    url: `${API_BASE}/projects/${bundle.inputData.projectId}`,
    method: "PATCH",
    body: updates,
  });
  return response.data.data;
};

module.exports = {
  key: "update_project",
  noun: "Project",

  display: {
    label: "Update Project",
    description: "Updates an existing Job-Dox project (status, client info, etc.).",
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "projectId",
        label: "Project ID",
        required: true,
        helpText: "The Job-Dox project ID to update. Use a search step or trigger to get this.",
      },
      { key: "name",        label: "Project Name",  required: false },
      {
        key: "status",
        label: "Status",
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
      { key: "clientName",  label: "Client Name",  required: false },
      { key: "clientPhone", label: "Client Phone", required: false },
      { key: "clientEmail", label: "Client Email", required: false },
      { key: "address",     label: "Address",      required: false },
    ],

    sample: {
      id: "proj_abc123",
      name: "Smith Water Damage - 123 Main St",
      status: "active",
      updatedAt: "2026-03-14T14:00:00.000Z",
    },

    outputFields: [
      { key: "id",          label: "Project ID"    },
      { key: "name",        label: "Project Name"  },
      { key: "status",      label: "Status"        },
      { key: "updatedAt",   label: "Updated At"    },
    ],
  },
};
