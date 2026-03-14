/**
 * index.js — Job-Dox Zapier App Definition
 *
 * This is the main entry point that Zapier loads.
 * It registers authentication, triggers, actions, and searches.
 */

const authentication = require("./auth");

// Triggers (Job-Dox → Zapier)
const newProject        = require("./triggers/new_project");
const projectStatusChanged = require("./triggers/project_status_changed");
const newEvent          = require("./triggers/new_event");

// Actions (Zapier → Job-Dox)
const createProject     = require("./actions/create_project");
const updateProject     = require("./actions/update_project");
const createContact     = require("./actions/create_contact");
const createTask        = require("./actions/create_task");
const emitEvent         = require("./actions/emit_event");

// Searches (Zapier lookups)
const findProject       = require("./searches/find_project");

// ── Middleware: inject Bearer token on every request ─────────
const addApiKey = (request, z, bundle) => {
  if (bundle.authData.apiKey) {
    request.headers.Authorization = `Bearer ${bundle.authData.apiKey}`;
  }
  return request;
};

// ── Middleware: handle error responses ───────────────────────
const handleErrors = (response, z, bundle) => {
  if (response.status === 401) {
    throw new z.errors.Error("Your API key is invalid or revoked. Please reconnect your Job-Dox account.");
  }
  if (response.status === 403) {
    throw new z.errors.Error("Your API key does not have permission for this action. Check the key scopes in Job-Dox → Settings → API Keys.");
  }
  if (response.status === 429) {
    throw new z.errors.Error("Rate limit reached. Job-Dox allows 60 requests per minute per API key.");
  }
  return response;
};

const App = {
  version: require("../package.json").version,
  platformVersion: require("zapier-platform-core").version,

  authentication,

  beforeRequest: [addApiKey],
  afterResponse: [handleErrors],

  triggers: {
    [newProject.key]:           newProject,
    [projectStatusChanged.key]: projectStatusChanged,
    [newEvent.key]:             newEvent,
  },

  actions: {
    [createProject.key]: createProject,
    [updateProject.key]: updateProject,
    [createContact.key]: createContact,
    [createTask.key]:    createTask,
    [emitEvent.key]:     emitEvent,
  },

  searches: {
    [findProject.key]: findProject,
  },
};

module.exports = App;
