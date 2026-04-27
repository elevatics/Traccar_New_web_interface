import { traccarDelete, traccarGet, traccarGetCollection, traccarPut } from "@/api/traccarRequest";

export type TraccarUser = {
  id: number;
  name: string;
  email: string;
  administrator: boolean;
  readonly: boolean;
  deviceReadonly: boolean;
  disabled: boolean;
};

const normalizeUser = (user: any): TraccarUser => ({
  id: Number(user?.id || 0),
  name: String(user?.name || ""),
  email: String(user?.email || ""),
  administrator: Boolean(user?.administrator),
  readonly: Boolean(user?.readonly),
  deviceReadonly: Boolean(user?.deviceReadonly),
  disabled: Boolean(user?.disabled),
});

export const getTraccarUsers = async (): Promise<TraccarUser[]> =>
  traccarGetCollection({
    url: "/users",
    normalize: normalizeUser,
  });

export const updateTraccarUserAccess = async ({
  userId,
  administrator,
  readonly,
  deviceReadonly,
  disabled,
}: {
  userId: number;
  administrator: boolean;
  readonly: boolean;
  deviceReadonly: boolean;
  disabled: boolean;
}) => {
  const current = await traccarGet(`/users/${userId}`);
  const payload = {
    ...current,
    administrator,
    readonly,
    deviceReadonly,
    disabled,
  };
  const updated = await traccarPut(`/users/${userId}`, payload);
  return normalizeUser(updated);
};

export const deleteTraccarUser = async (userId: number) => {
  await traccarDelete(`/users/${userId}`);
};
