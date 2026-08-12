import { Tool, User, HistoryRecord, ToolStatus } from '../types';


// Use relative path for production (works better behind proxies like Nginx)
// In development with 'npm run dev', Vite will need a proxy configuration if using relative paths.
const API_URL = '/api';


const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || response.statusText);
    }
    return response.json();
};

export const api = {
    // Tools
    getTools: async (): Promise<Tool[]> => {
        const response = await fetch(`${API_URL}/tools`);
        return handleResponse(response);
    },

    addTool: async (tool: Omit<Tool, 'id'>): Promise<Tool> => {
        const response = await fetch(`${API_URL}/tools`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tool),
        });
        return handleResponse(response);
    },

    updateTool: async (tool: Tool): Promise<Tool> => {
        const response = await fetch(`${API_URL}/tools/${tool.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tool),
        });
        return handleResponse(response);
    },

    deleteTool: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/tools/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete');
        }
    },

    // Users
    getUsers: async (): Promise<User[]> => {
        const response = await fetch(`${API_URL}/users`);
        return handleResponse(response);
    },

    addUser: async (user: Omit<User, 'id'>): Promise<User> => {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        return handleResponse(response);
    },

    updateUser: async (user: User): Promise<User> => {
        const response = await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
        return handleResponse(response);
    },

    deleteUser: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete');
        }
    },

    // History
    getHistory: async (): Promise<HistoryRecord[]> => {
        const response = await fetch(`${API_URL}/history`);
        return handleResponse(response);
    },

    addHistory: async (record: Omit<HistoryRecord, 'id'>): Promise<HistoryRecord> => {
        const response = await fetch(`${API_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
        });
        return handleResponse(response);
    },

    updateHistory: async (id: string, updates: Partial<HistoryRecord>): Promise<HistoryRecord> => {
        const response = await fetch(`${API_URL}/history/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return handleResponse(response);
    },

    // Auth
    getSetupStatus: async (): Promise<{ setupRequired: boolean }> => {
        const response = await fetch(`${API_URL}/auth/setup-status`);
        return handleResponse(response);
    },

    setupMaster: async (data: { name: string; matricula: string; password: string }): Promise<{ user: User, session: any, message: string }> => {
        const response = await fetch(`${API_URL}/auth/setup-master`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    login: async (matricula: string, password: string): Promise<{ user: User, session: any }> => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, password })
        });
        // Special handling for 403 (Force Reset) to parse JSON body
        if (response.status === 403) {
            const data = await response.json();
            if (data.forceReset) {
                throw { forceReset: true, message: data.error };
            }
        }
        return handleResponse(response);
    },

    firstAccess: async (matricula: string, password: string): Promise<{ user: User, message: string }> => {
        const response = await fetch(`${API_URL}/auth/first-access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, password })
        });
        return handleResponse(response);
    },

    resetUserPassword: async (id: string): Promise<{ message: string }> => {
        const response = await fetch(`${API_URL}/users/${id}/reset`, {
            method: 'POST',
        });
        return handleResponse(response);
    },

    clearTools: async (matricula: string, password: string): Promise<{ message: string }> => {
        const response = await fetch(`${API_URL}/admin/clear-tools`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, password })
        });
        return handleResponse(response);
    }
};
