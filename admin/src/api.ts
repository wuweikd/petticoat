type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const BASE = '/api';

function token() {
  return localStorage.getItem('petticoat_admin_token');
}

async function request<T>(
  path: string,
  init?: RequestInit & { method?: HttpMethod },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem('petticoat_admin_token');
    localStorage.removeItem('petticoat_admin_user');
    if (!path.includes('/auth/')) {
      window.location.href = '/login';
    }
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.message
        ? Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message
        : JSON.stringify(body);
    } catch {
      msg = await res.text();
    }
    throw new Error(msg || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type StaffUser = {
  id: string;
  phone: string | null;
  nickname: string;
  role: 'USER' | 'EDITOR' | 'ADMIN';
};

export type BrandRow = {
  id: string;
  name: string;
  _count?: { items: number };
};

export type VariantRow = {
  id: string;
  colorName: string;
  baseColor: string;
  cut: string;
  catalogImageUri?: string | null;
  wardrobeLinkCount?: number;
  linkedUserCount?: number;
  lockedForCreator?: boolean;
  _count?: { wardrobeEntries: number };
};

export type ItemRow = {
  id: string;
  name: string;
  category: string;
  brandId: string;
  brand: BrandRow;
  variants: VariantRow[];
  _count?: { variants: number };
};

export type ItemDetail = ItemRow & {
  createdByUserId: string;
  createdBy?: { id: string; nickname: string; phone: string | null };
};

export type UserRow = {
  id: string;
  phone: string | null;
  nickname: string;
  role: StaffUser['role'];
  createdAt: string;
  _count?: { wardrobeEntries: number; posts: number };
};

export type PostRow = {
  id: string;
  type: string;
  status: string;
  title: string;
  body?: string | null;
  releaseAt?: string | null;
  author?: { nickname: string };
  variants?: { variantId: string; variant?: VariantRow & { item?: ItemRow } }[];
};

export type Health = {
  ok: boolean;
  service: string;
  database: 'up' | 'down';
};

export const api = {
  health: () => request<Health>('/health'),
  adminLogin: (phone: string, code: string) =>
    request<{ accessToken: string; user: StaffUser }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
  me: () => request<StaffUser>('/auth/me'),

  listBrands: (q?: string) =>
    request<BrandRow[]>(
      `/admin/catalog/brands${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    ),
  createBrand: (name: string) =>
    request<BrandRow>('/admin/catalog/brands', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateBrand: (id: string, name: string) =>
    request<BrandRow>(`/admin/catalog/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  listItems: (q?: string) =>
    request<ItemRow[]>(
      `/admin/catalog/items${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    ),
  getItem: (id: string) => request<ItemDetail>(`/admin/catalog/items/${id}`),
  createItem: (body: Record<string, unknown>) =>
    request<ItemRow>('/admin/catalog/items', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateItem: (id: string, body: Record<string, unknown>) =>
    request<ItemRow>(`/admin/catalog/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  createVariant: (itemId: string, body: Record<string, unknown>) =>
    request<VariantRow>(`/admin/catalog/items/${itemId}/variants`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateVariant: (id: string, body: Record<string, unknown>) =>
    request<VariantRow>(`/admin/catalog/variants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteVariant: (id: string) =>
    request<{ ok: boolean }>(`/admin/catalog/variants/${id}`, {
      method: 'DELETE',
    }),

  listUsers: (q?: string) =>
    request<UserRow[]>(
      `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    ),
  updateUser: (id: string, body: Record<string, unknown>) =>
    request<UserRow>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  listPosts: (params?: { type?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    const s = q.toString();
    return request<PostRow[]>(`/admin/posts${s ? `?${s}` : ''}`);
  },
  createPost: (body: Record<string, unknown>) =>
    request<PostRow>('/admin/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updatePost: (id: string, body: Record<string, unknown>) =>
    request<PostRow>(`/admin/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deletePost: (id: string) =>
    request<{ ok: boolean }>(`/admin/posts/${id}`, { method: 'DELETE' }),
};
