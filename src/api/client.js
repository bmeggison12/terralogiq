const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function injectTerritory(path) {
  const skip = ['/auth', '/territories', '/company'];
  if (skip.some(p => path.startsWith(p))) return path;
  const tid = localStorage.getItem('activeTerritoryId');
  if (!tid) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}territory_id=${tid}`;
}

async function request(method, path, data) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const finalPath = method === 'GET' ? injectTerritory(path) : path;
  const config = { method, headers };
  if (data) config.body = JSON.stringify(data);

  const res = await fetch(`${BASE_URL}${finalPath}`, config);

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    return;
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

async function upload(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json;
}

export const api = {
  auth: {
    login: (data) => request('POST', '/auth/login', data),
    register: (data) => request('POST', '/auth/register', data),
    me: () => request('GET', '/auth/me')
  },
  territories: {
    list: () => request('GET', '/territories'),
    listAll: () => request('GET', '/territories/all'),
    seedDefaults: () => request('POST', '/territories/seed-defaults'),
    create: (data) => request('POST', '/territories', data),
    update: (id, data) => request('PUT', `/territories/${id}`, data),
    remove: (id) => request('DELETE', `/territories/${id}`),
    getUsers: (id) => request('GET', `/territories/${id}/users`),
    addUser: (id, user_id) => request('POST', `/territories/${id}/users`, { user_id }),
    removeUser: (id, userId) => request('DELETE', `/territories/${id}/users/${userId}`),
  },
  dashboard: {
    summary: () => request('GET', '/dashboard/summary'),
    rigsByOperator: () => request('GET', '/dashboard/rigs-by-operator'),
    pipelineSummary: () => request('GET', '/dashboard/pipeline-summary'),
    rigTrend: () => request('GET', '/dashboard/rig-trend'),
    recentActivity: () => request('GET', '/dashboard/recent-activity'),
    followUpsDue: () => request('GET', '/dashboard/follow-ups-due'),
    topOpportunities: () => request('GET', '/dashboard/top-opportunities'),
    msaSummary: () => request('GET', '/dashboard/msa-summary'),
    overdueAccounts: () => request('GET', '/dashboard/overdue-accounts'),
  },
  operators: {
    list: (params = {}) => request('GET', '/operators?' + new URLSearchParams(params)),
    get: (id) => request('GET', `/operators/${id}`),
    create: (data) => request('POST', '/operators', data),
    update: (id, data) => request('PUT', `/operators/${id}`, data),
    delete: (id) => request('DELETE', `/operators/${id}`),
    uploadPriceSheet: (id, file) => {
      const fd = new FormData();
      fd.append('file', file);
      return upload(`/operators/${id}/price-sheet`, fd);
    },
    deletePriceSheet: (id) => request('DELETE', `/operators/${id}/price-sheet`)
  },
  contacts: {
    list: (params = {}) => request('GET', '/contacts?' + new URLSearchParams(params)),
    create: (data) => request('POST', '/contacts', data),
    update: (id, data) => request('PUT', `/contacts/${id}`, data),
    delete: (id) => request('DELETE', `/contacts/${id}`),
    bulkImport: (contacts) => request('POST', '/contacts/bulk', { contacts }),
  },
  rigs: {
    list: (params = {}) => request('GET', '/rigs?' + new URLSearchParams(params)),
    summary: () => request('GET', '/rigs/summary'),
    history: (params = {}) => request('GET', '/rigs/history?' + new URLSearchParams(params)),
    marketShare: () => request('GET', '/rigs/market-share'),
    marketShareOverview: () => request('GET', '/rigs/market-share/overview'),
    setPeak: (id, data) => request('PUT', `/rigs/${id}/peak`, data),
    setProbability: (id, data) => request('PUT', `/rigs/${id}/probability`, data),
    setCompanyMan: (id, data) => request('PUT', `/rigs/${id}/company-man`, data),
    getEquipment: (id) => request('GET', `/rigs/${id}/equipment`),
    addEquipment: (id, data) => request('POST', `/rigs/${id}/equipment`, data),
    updateEquipment: (eqId, data) => request('PUT', `/rigs/equipment/${eqId}`, data),
    deleteEquipment: (eqId) => request('DELETE', `/rigs/equipment/${eqId}`),
    uploadCSV: (file) => {
      const fd = new FormData();
      fd.append('csv', file);
      return upload('/rigs/upload-csv', fd);
    }
  },
  revenuePackages: {
    list: () => request('GET', '/revenue-packages'),
    create: (data) => request('POST', '/revenue-packages', data),
    update: (id, data) => request('PUT', `/revenue-packages/${id}`, data),
    delete: (id) => request('DELETE', `/revenue-packages/${id}`),
  },
  jobSites: {
    listTypes: () => request('GET', '/job-sites/types'),
    createType: (data) => request('POST', '/job-sites/types', data),
    updateType: (id, data) => request('PUT', `/job-sites/types/${id}`, data),
    deleteType: (id) => request('DELETE', `/job-sites/types/${id}`),
    list: (params = {}) => request('GET', '/job-sites?' + new URLSearchParams(params)),
    create: (data) => request('POST', '/job-sites', data),
    update: (id, data) => request('PUT', `/job-sites/${id}`, data),
    delete: (id) => request('DELETE', `/job-sites/${id}`),
  },
  competitors: {
    list: (operatorId) => request('GET', `/operators/${operatorId}/competitors`),
    add: (operatorId, data) => request('POST', `/operators/${operatorId}/competitors`, data),
    remove: (operatorId, id) => request('DELETE', `/operators/${operatorId}/competitors/${id}`),
  },
  fracSites: {
    list: (params = {}) => request('GET', '/frac-sites?' + new URLSearchParams(params)),
    create: (data) => request('POST', '/frac-sites', data),
    update: (id, data) => request('PUT', `/frac-sites/${id}`, data),
    delete: (id) => request('DELETE', `/frac-sites/${id}`),
    uploadCSV: (file) => {
      const fd = new FormData();
      fd.append('csv', file);
      return upload('/frac-sites/upload-csv', fd);
    }
  },
  opportunities: {
    list: (params = {}) => request('GET', '/opportunities?' + new URLSearchParams(params)),
    pipeline: () => request('GET', '/opportunities/pipeline'),
    create: (data) => request('POST', '/opportunities', data),
    update: (id, data) => request('PUT', `/opportunities/${id}`, data),
    delete: (id) => request('DELETE', `/opportunities/${id}`)
  },
  salesLogs: {
    list: (params = {}) => request('GET', '/sales-logs?' + new URLSearchParams(params)),
    create: (data) => request('POST', '/sales-logs', data),
    update: (id, data) => request('PUT', `/sales-logs/${id}`, data),
    delete: (id) => request('DELETE', `/sales-logs/${id}`)
  },
  msa: {
    list: () => request('GET', '/msa'),
    save: (data) => request('POST', '/msa', data),
    update: (id, data) => request('PUT', `/msa/${id}`, data)
  },
  activities: {
    list: (params = {}) => request('GET', '/activities?' + new URLSearchParams(params)),
    stats: () => request('GET', '/activities/stats'),
    create: (data) => request('POST', '/activities', data),
    update: (id, data) => request('PUT', `/activities/${id}`, data),
    complete: (id, val) => request('PATCH', `/activities/${id}/complete`, { is_completed: val }),
    delete: (id) => request('DELETE', `/activities/${id}`),
  },
  company: {
    getProfile: () => request('GET', '/company/profile'),
    updateProfile: (data) => request('PUT', '/company/profile', data),
    uploadLogo: (file) => {
      const fd = new FormData(); fd.append('logo', file);
      return upload('/company/logo', fd);
    },
    deleteLogo: () => request('DELETE', '/company/logo'),
    getProducts: () => request('GET', '/company/products'),
    createProduct: (data) => request('POST', '/company/products', data),
    updateProduct: (id, data) => request('PUT', `/company/products/${id}`, data),
    uploadProductImage: (id, file) => {
      const fd = new FormData(); fd.append('image', file);
      return upload(`/company/products/${id}/image`, fd);
    },
    deleteProduct: (id) => request('DELETE', `/company/products/${id}`),
    getPriceSheets: () => request('GET', '/company/price-sheets'),
    uploadPriceSheet: (file, name, notes) => {
      const fd = new FormData();
      fd.append('file', file);
      if (name) fd.append('name', name);
      if (notes) fd.append('notes', notes);
      return upload('/company/price-sheets', fd);
    },
    downloadPriceSheet: (id) => request('GET', `/company/price-sheets/${id}/download`),
    deletePriceSheet: (id) => request('DELETE', `/company/price-sheets/${id}`),
    getActiveSites: () => request('GET', '/company/active-sites'),
    createActiveSite: (data) => request('POST', '/company/active-sites', data),
    updateActiveSite: (id, data) => request('PUT', `/company/active-sites/${id}`, data),
    deleteActiveSite: (id) => request('DELETE', `/company/active-sites/${id}`),
  },
  reports: {
    downloadPDF: async () => {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/reports/weekly-pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    revenueCalculator: () => request('GET', '/reports/revenue-calculator')
  }
};
