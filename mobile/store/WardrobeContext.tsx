import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { CatalogHit } from '@/domain/search';
import type {
  BaseColor,
  Brand,
  CalendarReminder,
  Cut,
  Item,
  ItemCategory,
  PreorderRecord,
  UserProfile,
  Variant,
  WardrobeEntry,
  WardrobeStatus,
} from '@/domain/types';
import { CUT_LABEL } from '@/domain/types';
import { api } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';

type CatalogBundle = {
  brands: Brand[];
  items: Item[];
  variants: Variant[];
  entries: WardrobeEntry[];
  preorders: PreorderRecord[];
  reminders: CalendarReminder[];
  profile: UserProfile;
};

const emptyProfile = (id = 'guest'): UserProfile => ({
  id,
  nickname: '游客',
  preferredSubstyles: [],
  favoriteBrandIds: [],
  reduceMotion: false,
});

const emptyState = (): CatalogBundle => ({
  brands: [],
  items: [],
  variants: [],
  entries: [],
  preorders: [],
  reminders: [],
  profile: emptyProfile(),
});

type AddToWardrobeInput = {
  brandId: string;
  brandName?: string;
  itemName: string;
  category: ItemCategory;
  cut: Cut;
  colorName: string;
  baseColor: BaseColor;
  status: WardrobeStatus;
  size?: string;
  depositAmountCny?: number;
  balanceAmountCny?: number;
  balanceDueAt?: string;
  existingVariantId?: string;
  userImageUris?: string[];
};

type WardrobeContextValue = CatalogBundle & {
  ready: boolean;
  signedIn: boolean;
  refresh: () => Promise<void>;
  addToWardrobe: (input: AddToWardrobeInput) => Promise<{ entryId: string }>;
  searchCatalog: (query: string) => Promise<CatalogHit[]>;
  updateEntry: (
    entryId: string,
    patch: {
      status?: WardrobeStatus;
      size?: string;
      note?: string;
      private?: boolean;
      hidePreorder?: boolean;
      userImageUris?: string[];
    },
  ) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
  wantVariant: (
    variantId: string,
    opts?: { sourcePostId?: string; addReleaseReminder?: boolean },
  ) => Promise<{
    created: boolean;
    entryId: string;
    status: string;
    message: string;
    reminderAdded?: boolean;
  }>;
  markArrived: (preorderId: string) => Promise<void>;
  markBalancePaid: (preorderId: string) => Promise<void>;
  cancelPreorder: (preorderId: string) => Promise<void>;
  addManualReminder: (title: string, at: string) => Promise<void>;
  removeReminder: (reminderId: string) => Promise<void>;
  setReduceMotion: (value: boolean) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  toggleSubstyle: (style: UserProfile['preferredSubstyles'][number]) => Promise<void>;
  toggleFavoriteBrand: (brandId: string) => Promise<void>;
  getBrand: (id: string) => Brand | undefined;
  getItem: (id: string) => Item | undefined;
  getVariant: (id: string) => Variant | undefined;
  getEntryView: (entryId: string) => {
    entry: WardrobeEntry;
    variant: Variant;
    item: Item;
    brand: Brand;
    openPreorders: PreorderRecord[];
    allPreorders: PreorderRecord[];
  } | null;
  entriesByStatus: (status: WardrobeStatus) => WardrobeEntry[];
  openBalances: () => { preorder: PreorderRecord; entry: WardrobeEntry; label: string }[];
};

const WardrobeContext = createContext<WardrobeContextValue | null>(null);

function mapBootstrap(data: Record<string, unknown>): CatalogBundle {
  return {
    brands: (data.brands as Brand[]) ?? [],
    items: (data.items as Item[]) ?? [],
    variants: (data.variants as Variant[]) ?? [],
    entries: (data.entries as WardrobeEntry[]) ?? [],
    preorders: (data.preorders as PreorderRecord[]) ?? [],
    reminders: (data.reminders as CalendarReminder[]) ?? [],
    profile: (data.profile as UserProfile) ?? emptyProfile(),
  };
}

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const { ready: authReady, user, token } = useAuth();
  const [state, setState] = useState<CatalogBundle>(emptyState);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      try {
        const brands = await api.listBrands();
        setState({
          ...emptyState(),
          brands: brands.map((b) => ({ id: b.id, name: b.name })),
          profile: emptyProfile(),
        });
      } catch {
        setState(emptyState());
      }
      return;
    }
    const data = await api.wardrobeBootstrap();
    setState(mapBootstrap(data));
  }, [token]);

  useEffect(() => {
    if (!authReady) return;
    (async () => {
      try {
        await refresh();
      } catch {
        setState(emptyState());
      } finally {
        setReady(true);
      }
    })();
  }, [authReady, user?.id, refresh]);

  const getBrand = useCallback(
    (id: string) => state.brands.find((b) => b.id === id),
    [state.brands],
  );
  const getItem = useCallback(
    (id: string) => state.items.find((i) => i.id === id),
    [state.items],
  );
  const getVariant = useCallback(
    (id: string) => state.variants.find((v) => v.id === id),
    [state.variants],
  );

  const searchCatalogFn = useCallback(async (query: string): Promise<CatalogHit[]> => {
    const q = query.trim();
    if (!q) return [];
    const hits = await api.searchCatalog(q);
    return hits.map((h) => ({
      brand: h.brand,
      item: {
        ...h.item,
        category: h.item.category as ItemCategory,
      },
      variant: {
        ...h.variant,
        cut: h.variant.cut as Cut,
        baseColor: h.variant.baseColor as BaseColor,
      },
      score: 80,
      label: h.label,
    }));
  }, []);

  const addToWardrobe = useCallback(
    async (input: AddToWardrobeInput) => {
      if (!token) {
        throw new Error('NEED_LOGIN');
      }
      const result = await api.addToWardrobe({
        ...input,
      });
      await refresh();
      return result;
    },
    [token, refresh],
  );

  const updateEntry = useCallback(
    async (
      entryId: string,
      patch: {
        status?: WardrobeStatus;
        size?: string;
        note?: string;
        private?: boolean;
        hidePreorder?: boolean;
        userImageUris?: string[];
      },
    ) => {
      if (!token) throw new Error('NEED_LOGIN');
      await api.updateEntry(entryId, patch);
      await refresh();
    },
    [token, refresh],
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!token) throw new Error('NEED_LOGIN');
      await api.removeEntry(entryId);
      await refresh();
    },
    [token, refresh],
  );

  const wantVariant = useCallback(
    async (
      variantId: string,
      opts?: { sourcePostId?: string; addReleaseReminder?: boolean },
    ) => {
      if (!token) throw new Error('NEED_LOGIN');
      const res = await api.wantVariant(variantId, opts);
      await refresh();
      return res;
    },
    [token, refresh],
  );

  const markArrived = useCallback(
    async (preorderId: string) => {
      if (!token) throw new Error('NEED_LOGIN');
      await api.markArrived(preorderId);
      await refresh();
    },
    [token, refresh],
  );

  const markBalancePaid = useCallback(
    async (preorderId: string) => {
      if (!token) throw new Error('NEED_LOGIN');
      await api.markBalancePaid(preorderId);
      await refresh();
    },
    [token, refresh],
  );

  const cancelPreorder = useCallback(
    async (preorderId: string) => {
      if (!token) throw new Error('NEED_LOGIN');
      await api.cancelPreorder(preorderId);
      await refresh();
    },
    [token, refresh],
  );

  const addManualReminder = useCallback(
    async (title: string, at: string) => {
      if (!token) throw new Error('NEED_LOGIN');
      await api.addReminder(title, at);
      await refresh();
    },
    [token, refresh],
  );

  const removeReminder = useCallback(
    async (reminderId: string) => {
      if (!token) throw new Error('NEED_LOGIN');
      await api.removeReminder(reminderId);
      await refresh();
    },
    [token, refresh],
  );

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!token) throw new Error('NEED_LOGIN');
      const {
        id: _id,
        phone: _phone,
        ...rest
      } = patch as UserProfile & Partial<UserProfile>;
      await api.updateProfile(rest);
      await refresh();
    },
    [token, refresh],
  );

  const setReduceMotion = useCallback(
    async (value: boolean) => {
      await updateProfile({ reduceMotion: value });
    },
    [updateProfile],
  );

  const toggleSubstyle = useCallback(
    async (style: UserProfile['preferredSubstyles'][number]) => {
      const has = state.profile.preferredSubstyles.includes(style);
      const preferredSubstyles = has
        ? state.profile.preferredSubstyles.filter((s) => s !== style)
        : [...state.profile.preferredSubstyles, style];
      await updateProfile({ preferredSubstyles });
    },
    [state.profile.preferredSubstyles, updateProfile],
  );

  const toggleFavoriteBrand = useCallback(
    async (brandId: string) => {
      const has = state.profile.favoriteBrandIds.includes(brandId);
      const favoriteBrandIds = has
        ? state.profile.favoriteBrandIds.filter((id) => id !== brandId)
        : [...state.profile.favoriteBrandIds, brandId];
      await updateProfile({ favoriteBrandIds });
    },
    [state.profile.favoriteBrandIds, updateProfile],
  );

  const getEntryView = useCallback(
    (entryId: string) => {
      const entry = state.entries.find((e) => e.id === entryId);
      if (!entry) return null;
      const variant = getVariant(entry.variantId);
      if (!variant) return null;
      const item = getItem(variant.itemId);
      if (!item) return null;
      const brand = getBrand(item.brandId);
      if (!brand) return null;
      const allPreorders = state.preorders.filter((p) => p.wardrobeEntryId === entryId);
      const openPreorders = allPreorders.filter(
        (p) => !p.cancelled && !p.archived && !p.balancePaid,
      );
      return { entry, variant, item, brand, openPreorders, allPreorders };
    },
    [state.entries, state.preorders, getBrand, getItem, getVariant],
  );

  const entriesByStatus = useCallback(
    (status: WardrobeStatus) => state.entries.filter((e) => e.status === status),
    [state.entries],
  );

  const openBalances = useCallback(() => {
    return state.preorders
      .filter((p) => !p.cancelled && !p.archived && !p.balancePaid)
      .map((preorder) => {
        const entry = state.entries.find((e) => e.id === preorder.wardrobeEntryId)!;
        const variant = getVariant(entry.variantId);
        const item = variant ? getItem(variant.itemId) : undefined;
        const brand = item ? getBrand(item.brandId) : undefined;
        const cutLabel = variant ? CUT_LABEL[variant.cut] : undefined;
        const label = [brand?.name, item?.name, variant?.colorName, cutLabel]
          .filter(Boolean)
          .join(' · ');
        return { preorder, entry, label };
      })
      .sort((a, b) => a.preorder.balanceDueAt.localeCompare(b.preorder.balanceDueAt));
  }, [state.preorders, state.entries, getBrand, getItem, getVariant]);

  const value = useMemo<WardrobeContextValue>(
    () => ({
      ...state,
      ready: ready && authReady,
      signedIn: !!user,
      refresh,
      addToWardrobe,
      searchCatalog: searchCatalogFn,
      updateEntry,
      removeEntry,
      wantVariant,
      markArrived,
      markBalancePaid,
      cancelPreorder,
      addManualReminder,
      removeReminder,
      setReduceMotion,
      updateProfile,
      toggleSubstyle,
      toggleFavoriteBrand,
      getBrand,
      getItem,
      getVariant,
      getEntryView,
      entriesByStatus,
      openBalances,
    }),
    [
      state,
      ready,
      authReady,
      user,
      refresh,
      addToWardrobe,
      searchCatalogFn,
      updateEntry,
      removeEntry,
      wantVariant,
      markArrived,
      markBalancePaid,
      cancelPreorder,
      addManualReminder,
      removeReminder,
      setReduceMotion,
      updateProfile,
      toggleSubstyle,
      toggleFavoriteBrand,
      getBrand,
      getItem,
      getVariant,
      getEntryView,
      entriesByStatus,
      openBalances,
    ],
  );

  return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error('useWardrobe 必须在 WardrobeProvider 内使用');
  return ctx;
}
