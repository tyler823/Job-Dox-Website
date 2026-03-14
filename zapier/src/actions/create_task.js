/**
 * Action: Create Task
 *
 * Creates a task on a Job-Dox project.
 * Use case: Google Forms submission → Zapier → create a task in Job-Dox.
 */

const API_BASE = "https://job-dox.ai/.netlify/functions/api-v1";

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${API_BASE}/projects/${bundle.inputData.projectId}/tasks`,
    method: "POST",
    body: {
      title: bundle.inputData.title,
      description: bundle.inputData.description || "",
      assignee: bundle.inputData.assignee || null,
      status: bundle.inputData.status || "pending",
    },
  });
  return response.data.data;
};

module.exports = {
  key: "create_task",
  noun: "Task",

  display: {
    label: "Create Task",
    description: "Creates a task on a Job-Dox project.",
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "projectId",
        label: "Project ID",
        required: true,
        helpText: "The project to add this task to.",
      },
      { key: "title",       label: "Task Title",       required: true  },
      { key: "description", label: "Task Description", required: false },
      { key: "assignee",    label: "Assignee Name",    required: false },
      {
        key: "status",
        label: "Status",
        required: false,
        choices: { pending: "Pending", in_progress: "In Progress", completed: "Completed" },
        default: "pending",
      },
    ],

    sample: {
      id: "task_789",
      title: "Set up dehumidifiers in basement",
      description: "Client reports standing water in NE corner",
      assignee: "Mike Johnson",
      status: "pending",
      createdAt: "2026-03-14T12:00:00.000Z",
    },

    outputFields: [
      { key: "id",          label: "Task ID"     },
      { key: "title",       label: "Title"       },
      { key: "description", label: "Description" },
      { key: "assignee",    label: "Assignee"    },
      { key: "status",      label: "Status"      },
      { key: "createdAt",   label: "Created At"  },
    ],
  },
};
