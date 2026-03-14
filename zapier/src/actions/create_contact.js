/**
 * Action: Create Contact
 *
 * Adds a contact to a Job-Dox project.
 * Use case: CRM adds a new adjuster → auto-create contact on the project.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/projects/${bundle.inputData.projectId}/contacts`,
    method: "POST",
    body: {
      name: bundle.inputData.name,
      phone: bundle.inputData.phone || "",
      email: bundle.inputData.email || "",
      role: bundle.inputData.role || "other",
    },
  });
  return response.data.data;
};

module.exports = {
  key: "create_contact",
  noun: "Contact",

  display: {
    label: "Create Contact",
    description: "Adds a contact (homeowner, adjuster, etc.) to a Job-Dox project.",
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "projectId",
        label: "Project ID",
        required: true,
        helpText: "The project to add this contact to.",
      },
      { key: "name",  label: "Contact Name",  required: true  },
      { key: "phone", label: "Phone",         required: false },
      { key: "email", label: "Email",         required: false },
      {
        key: "role",
        label: "Role",
        required: false,
        choices: {
          homeowner: "Homeowner",
          adjuster: "Insurance Adjuster",
          agent: "Insurance Agent",
          property_manager: "Property Manager",
          tenant: "Tenant",
          vendor: "Vendor / Subcontractor",
          other: "Other",
        },
        default: "homeowner",
      },
    ],

    sample: {
      id: "contact_123",
      name: "Jane Doe",
      phone: "(555) 987-6543",
      email: "jane@insurance.com",
      role: "adjuster",
      createdAt: "2026-03-14T12:00:00.000Z",
    },

    outputFields: [
      { key: "id",        label: "Contact ID"  },
      { key: "name",      label: "Name"        },
      { key: "phone",     label: "Phone"       },
      { key: "email",     label: "Email"       },
      { key: "role",      label: "Role"        },
      { key: "createdAt", label: "Created At"  },
    ],
  },
};
