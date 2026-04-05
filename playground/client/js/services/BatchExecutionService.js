/*
   BatchExecutionService
   HTTP execution client for one-shot /api/execute runs.
*/

export class BatchExecutionService {
  constructor(baseUrl = '') {
    this.baseUrl = typeof baseUrl === 'string' ? baseUrl.replace(/\/+$/, '') : '';
  }

  _buildUrl(pathname) {
    const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return this.baseUrl ? `${this.baseUrl}${cleanPath}` : cleanPath;
  }

  async execute(payload) {
    const response = await fetch(this._buildUrl('/api/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid server response.');
    }

    return { response, data };
  }
}

