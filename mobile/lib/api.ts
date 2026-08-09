import Constants from 'expo-constants';
import { File, UploadType } from 'expo-file-system';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
export const API_BASE =
  extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://127.0.0.1:3001/api';

/** API origin without `/api` — used to resolve `/uploads/...` paths */
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function resolveMediaUri(uri?: string | null): string | null {
  if (!uri) return null;
  if (/^https?:\/\//i.test(uri) || uri.startsWith('file:') || uri.startsWith('data:')) {
    return uri;
  }
  return `${API_ORIGIN}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

/**
 * 把接口/原生抛出的英文技术错误，转成可操作的中文说明。
 * 已是中文的文案会原样返回。
 */
export function formatErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const msg = String(raw || '').trim();
  if (!msg) {
    return '发生未知错误，请稍后重试。若反复出现，请确认后端已启动且网络正常。';
  }

  // 先匹配已知英文技术错误，再放行已有中文文案
  const rules: { test: RegExp; text: string }[] = [
    {
      test: /Unsupported FormDataPart implementation/i,
      text:
        '图片上传失败：当前运行环境不支持旧版「uri 对象」打包方式。请重新从相册选择图片后再试；若刚升级过 App，请完全重启后再上传。',
    },
    {
      test: /Unsupported FormData implementation/i,
      text:
        '图片上传失败：表单数据格式不被当前环境支持。请重新选择图片，或改用拍照后重试。',
    },
    {
      test: /Network request failed/i,
      text:
        '网络请求失败：连不上服务器。请确认手机与电脑在同一 Wi‑Fi、后端已启动，并检查 API 地址是否为本机可达地址。',
    },
    {
      test: /Failed to fetch|fetch failed/i,
      text: '无法访问接口：请检查网络与 API 地址配置后重试。',
    },
    {
      test: /^Network Error$/i,
      text: '网络异常，请检查网络连接后重试。',
    },
    {
      test: /timeout|timed out|ETIMEDOUT/i,
      text: '请求超时：服务器响应过慢或不可达，请稍后重试。',
    },
    {
      test: /ECONNREFUSED|Connection refused/i,
      text: '连接被拒绝：后端可能未启动，或端口/地址配置不正确。',
    },
    {
      test: /^NEED_LOGIN$/,
      text: '需要先登录才能继续此操作。',
    },
    {
      test: /AbortError|The operation was aborted/i,
      text: '操作已取消。',
    },
    {
      test: /ENOENT|no such file|file not found/i,
      text: '找不到所选图片文件（可能已被系统清理）。请重新从相册选择或拍照。',
    },
    {
      test: /^(Unauthorized|Forbidden)$/i,
      text: '没有权限完成此操作。请确认已登录，并在系统设置中允许访问照片/相机。',
    },
    {
      test: /Entity Too Large|Payload Too Large|file too large/i,
      text: '图片过大（单张上限约 8MB）。请压缩后再上传，或换一张较小的图。',
    },
    {
      test: /JSON Parse|Unexpected token/i,
      text: '服务器返回了无法解析的数据。请确认 API 地址正确，且后端版本与客户端匹配。',
    },
  ];

  for (const rule of rules) {
    if (rule.test.test(msg)) return rule.text;
  }

  if (/[\u4e00-\u9fff]/.test(msg)) return msg;

  return `操作失败：${msg}`;
}

type StaffUser = {
  id: string;
  phone: string | null;
  nickname: string;
  role: string;
};

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

function guessMimeType(uri: string): string {
  const name = (uri.split('/').pop() || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!isForm && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    throw new Error(formatErrorMessage(e));
  }

  if (!res.ok) {
    let msg = `请求失败（HTTP ${res.status}）`;
    try {
      const body = await res.json();
      msg = Array.isArray(body.message)
        ? body.message.join('；')
        : body.message || msg;
    } catch {
      try {
        const text = await res.text();
        if (text) msg = text;
      } catch {
        /* ignore */
      }
    }
    const err = new Error(formatErrorMessage(msg)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch (e) {
    throw new Error(formatErrorMessage(e));
  }
}

export type CatalogSearchHit = {
  brand: { id: string; name: string };
  item: {
    id: string;
    brandId: string;
    name: string;
    category: string;
    createdByUserId: string;
  };
  variant: {
    id: string;
    itemId: string;
    colorName: string;
    baseColor: string;
    cut: string;
    catalogImageUri?: string;
  };
  label: string;
};

export const api = {
  sendCode: (phone: string) =>
    request<{ ok: boolean; hint?: string; devCode?: string }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  login: (phone: string, code: string) =>
    request<{ accessToken: string; user: StaffUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
  searchCatalog: (q: string) =>
    request<CatalogSearchHit[]>(`/catalog/search?q=${encodeURIComponent(q)}`),
  listBrands: () =>
    request<{ id: string; name: string }[]>('/catalog/brands'),
  wardrobeBootstrap: () => request<Record<string, unknown>>('/me/wardrobe'),
  addToWardrobe: (body: Record<string, unknown>) =>
    request<{ entryId: string }>('/me/wardrobe/entries', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  wantVariant: (
    variantId: string,
    opts?: { sourcePostId?: string; addReleaseReminder?: boolean },
  ) =>
    request<{
      created: boolean;
      entryId: string;
      status: string;
      message: string;
      label: string;
      reminderAdded?: boolean;
    }>('/me/wardrobe/want', {
      method: 'POST',
      body: JSON.stringify({ variantId, ...opts }),
    }),
  updateEntry: (id: string, patch: Record<string, unknown>) =>
    request(`/me/wardrobe/entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  removeEntry: (id: string) =>
    request<{ ok: boolean }>(`/me/wardrobe/entries/${id}`, {
      method: 'DELETE',
    }),
  markArrived: (id: string) =>
    request<{ ok: boolean }>(`/me/wardrobe/preorders/${id}/arrive`, {
      method: 'POST',
    }),
  markBalancePaid: (id: string) =>
    request<{ ok: boolean }>(`/me/wardrobe/preorders/${id}/pay-balance`, {
      method: 'POST',
    }),
  cancelPreorder: (id: string) =>
    request<{ ok: boolean }>(`/me/wardrobe/preorders/${id}/cancel`, {
      method: 'POST',
    }),
  addReminder: (title: string, at: string) =>
    request('/me/wardrobe/reminders', {
      method: 'POST',
      body: JSON.stringify({ title, at }),
    }),
  removeReminder: (id: string) =>
    request<{ ok: boolean }>(`/me/wardrobe/reminders/${id}`, {
      method: 'DELETE',
    }),
  updateProfile: (patch: Record<string, unknown>) =>
    request('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  feedDiscover: (opts?: { type?: string; brandId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (opts?.type) q.set('type', opts.type);
    if (opts?.brandId) q.set('brandId', opts.brandId);
    if (opts?.limit) q.set('limit', String(opts.limit));
    const qs = q.toString();
    return request<FeedPost[]>(`/posts/feed/discover${qs ? `?${qs}` : ''}`);
  },
  feedFollowing: () => request<FeedPost[]>('/posts/feed/following'),
  getPost: (id: string) => request<FeedPost>(`/posts/${id}`),
  listMyPosts: () => request<FeedPost[]>('/me/posts'),
  follow: (userId: string) =>
    request<{ ok: boolean; following: boolean }>(`/me/following/${userId}`, {
      method: 'POST',
    }),
  unfollow: (userId: string) =>
    request<{ ok: boolean; following: boolean }>(`/me/following/${userId}`, {
      method: 'DELETE',
    }),
  followStatus: (userId: string) =>
    request<{ followers: number; following: number; isFollowing: boolean }>(
      `/me/following/${userId}/status`,
    ),
  followStatsPublic: (userId: string) =>
    request<{ followers: number; following: number; isFollowing: boolean }>(
      `/users/${userId}/follow-stats`,
    ),
  wishlistOverlap: () =>
    request<{ variantId: string; label: string; users: { id: string; nickname: string }[] }[]>(
      '/me/wishlist-overlap',
    ),
  publicWardrobe: (userId: string) =>
    request<{
      visible: boolean;
      visibility: string;
      owner?: { id: string; nickname: string };
      entries: { id: string; status: string; label: string; variantId: string }[];
    }>(`/users/${userId}/wardrobe`),
  createPost: (body: {
    type: 'outfit' | 'tutorial';
    title: string;
    body?: string;
    coverUri?: string;
    imageUris?: string[];
    variantIds?: string[];
    coordinateId?: string;
    status?: 'published' | 'draft';
  }) =>
    request<FeedPost>('/me/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  uploadImage: async (localUri: string) => {
    if (!localUri?.trim()) {
      throw new Error('请先选择要上传的图片。');
    }
    try {
      // 使用 expo-file-system 原生 multipart，避免 RN FormData `{uri,name,type}`
      // 触发 expo/fetch 的 Unsupported FormDataPart implementation
      const file = new File(localUri);
      const result = await file.upload(`${API_BASE}/uploads/image`, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: guessMimeType(localUri),
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });

      if (result.status < 200 || result.status >= 300) {
        let msg = `图片上传失败（HTTP ${result.status}）`;
        try {
          const body = JSON.parse(result.body) as { message?: string | string[] };
          msg = Array.isArray(body.message)
            ? body.message.join('；')
            : body.message || msg;
        } catch {
          if (result.body?.trim()) msg = result.body.trim();
        }
        throw new Error(msg);
      }

      const parsed = JSON.parse(result.body) as {
        uri: string;
        url: string;
        filename: string;
      };
      if (!parsed?.uri) {
        throw new Error('图片已上传，但服务器未返回可用地址，请稍后重试。');
      }
      return parsed;
    } catch (e) {
      throw new Error(formatErrorMessage(e));
    }
  },
  listCoordinates: () => request<CoordinateDetail[]>('/me/coordinates'),
  getCoordinate: (id: string) =>
    request<CoordinateDetail>(`/me/coordinates/${id}`),
  createCoordinate: (body: {
    title?: string;
    slots?: CoordinateSlotInput[];
  }) =>
    request<CoordinateDetail>('/me/coordinates', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateCoordinate: (
    id: string,
    body: { title?: string | null; slots?: CoordinateSlotInput[] },
  ) =>
    request<CoordinateDetail>(`/me/coordinates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  removeCoordinate: (id: string) =>
    request<{ ok: boolean }>(`/me/coordinates/${id}`, { method: 'DELETE' }),
};

export type CoordinateSlotInput = {
  kind: 'main' | 'extra';
  category?: string;
  variantId: string;
  sortOrder?: number;
};

export type CoordinateSlotView = {
  id: string;
  kind: 'main' | 'extra';
  category: string | null;
  variantId: string;
  sortOrder: number;
  label: string;
  inWardrobe: boolean;
  notArrived: boolean;
  wardrobeStatus: string | null;
  statusLabel: string;
  variant: {
    id: string;
    colorName: string;
    baseColor: string;
    cut: string;
    item: {
      id: string;
      name: string;
      category: string;
      brand: { id: string; name: string };
    };
  };
};

export type CoordinateDetail = {
  id: string;
  ownerId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  slots: CoordinateSlotView[];
};

export type FeedPostVariant = {
  variantId: string;
  sortOrder: number;
  variant: {
    id: string;
    colorName: string;
    baseColor: string;
    cut: string;
    item: {
      id: string;
      name: string;
      category: string;
      brand: { id: string; name: string };
    };
  };
};

export type FeedPost = {
  id: string;
  type: string;
  status: string;
  title: string;
  body?: string | null;
  coverUri?: string | null;
  imageUris?: string[];
  releaseAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  author: { id: string; nickname: string; role?: string };
  variants: FeedPostVariant[];
  coordinateId?: string | null;
};
